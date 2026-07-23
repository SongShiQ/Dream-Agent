# Foundation 题目蓝图、错误归因与服务端学习门禁工作日志

**日期**：2026-07-21  
**状态**：已完成并通过真实临时学生流程验收

## 本次目标

在不依赖陈老师排版或内容审批的前提下，继续收紧导学/基础阶段的学习证据闭环：

- 让 Foundation 小测选题有可解释的难度和标签蓝图。
- 让学生提交后知道“错在哪、回看哪张知识卡、下一步做什么”。
- 把前置单元和题集漂移检查放到服务端，不能只依赖前端按钮状态。
- 保持原有边界：只有 high-stakes quiz 通过才授予 Foundation mastery，诊断和补弱建议不改变达标结果。

## 发现的工程问题

1. 题目虽然只按当前单元标签筛选，但原逻辑总取匹配题中难度最高的 5 题，不能保证基础到进阶的梯度，也无法解释标签覆盖情况。
2. Foundation 单元的 locked 状态只在前端禁用按钮，客户端仍可直接请求后置单元创建 attempt。
3. 提交结果只有分数和状态，没有按知识点聚合的错误归因，也没有稳定的知识卡补弱入口。
4. 如果 attempt 创建后课程单元或题目被删除，提交可能按不完整题集计算结果。

## 实现内容

### 1. 确定性题目蓝图

修改 `lib/foundation/units.ts`：

- 新增 `FOUNDATION_DIFFICULTY_TARGETS = [35, 40, 45, 50, 55]`。
- `selectFoundationQuestionSet` 逐槽位优先覆盖当前单元的可用 `quizTags`，每个槽位选择最接近目标难度的题。
- 语义标签当前没有题目时，只回退到另一个匹配标签，绝不跨主题补题。
- 选题排序完全由难度距离和稳定 ID 决定，不依赖随机数，alternate set 可复现。
- 新增 `summarizeFoundationQuestionSet`，返回题数、已覆盖标签、缺失语义标签、难度最小/最大/平均值；不返回答案或隐藏字段。

当前虚拟内存真实选题摘要：

```json
{
  "count": 5,
  "coveredTags": ["memory", "virtual_memory", "page_fault"],
  "missingTags": [],
  "difficulty": { "min": 35, "max": 50, "average": 44 }
}
```

### 2. 提交后错误归因和知识卡补弱

新增纯规则函数：

- `buildFoundationQuizDiagnosis`：按题目的目标知识点统计错误数、总数和错误率，按错误数、错误率和课程标签顺序排序。
- `selectFoundationRemediationCards`：优先匹配知识卡 `questionTags`，再匹配卡片 `tags`，返回最多 3 张学生可见卡片。

提交 API 现在返回：

- `diagnosis.weakPoints`：例如 `memory 5/5`、`page_fault 2/2`。
- `diagnosis.recommendedCards`：例如 `[K:virtual-memory] 虚拟内存与缺页`。
- `diagnosis.nextAction`：失败时“先复习再挑战下一套题”，通过时“按到期复习计划继续巩固”。

Foundation 面板只展示诊断和补弱入口，不依据诊断自动修改 mastery。

### 3. 服务端门禁和漂移保护

- `startFoundationQuizAttempt` 服务端重新计算当前学生的 Foundation progress，locked 单元返回 `FOUNDATION_UNIT_LOCKED` / HTTP 409，并返回前置单元。
- 提交时若题目数量与 attempt 快照不一致，返回 `ATTEMPT_QUESTION_SET_STALE` / HTTP 409。
- 提交时若课程单元已不存在，返回 `ATTEMPT_UNIT_STALE` / HTTP 409。
- `components/FoundationUnitPanel.tsx` 对上述错误显示可理解的恢复提示。

## API 合同

### 启动小测

`POST /api/foundation`，`action=start` 成功时增加：

```json
{
  "questionSet": {
    "count": 5,
    "coveredTags": [],
    "missingTags": [],
    "difficulty": { "min": 0, "max": 0, "average": 0 }
  }
}
```

失败时：

- `409 FOUNDATION_UNIT_LOCKED`
- `422 QUESTION_SET_INSUFFICIENT`
- `429 HIGH_STAKES_LIMIT_REACHED`

### 提交小测

成功响应增加 `diagnosis`；若 attempt 快照已漂移，返回：

- `409 ATTEMPT_QUESTION_SET_STALE`
- `409 ATTEMPT_UNIT_STALE`

## 测试和真实流程

- `tests/foundation/units.test.ts`：覆盖蓝图梯度、标签覆盖、排除题、知识点错误归因、知识卡排序。
- `tests/api/foundation.test.ts`：覆盖诊断透传、题集漂移 409、服务端 locked 409。
- 全量 Vitest：41 个测试文件、168 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，`/api/foundation` 正常生成动态路由。
- `content:release-check` development：0 error、49 warning、0 foundation coverage issue。

### 临时学生纵向验收

使用临时学生 `foundation-blueprint-rehearsal`：

1. 未完成 `process-scheduling` 时启动 `memory-virtual-memory`，服务端返回 `FOUNDATION_UNIT_LOCKED`。
2. 仅补齐两个前置高 stakes 夹具后启动 memory practice，选题摘要覆盖 memory、virtual_memory、page_fault。
3. 提交 5 道空答案，结果为 `failed 0/5`，未产生 mastery。
4. 返回 3 个薄弱知识点和 2 张学生可见知识卡，其中包含 `[K:virtual-memory]`。
5. ReviewSchedule 为 `due`、`repetition=0`、`lastEvidencePassed=false`。
6. 临时学生、attempt、AnswerRecord、ReviewSchedule 已级联清理，残留均为 0。

## 当前边界

- 题目蓝图是确定性抽样，不代表教师已经认可每道题的教学质量。
- 语义标签 `variables`、`match`、`os_overview` 等仍有细标缺口；当前通过 `missingTags` 暴露，不自动阻断已有基础单元。
- 诊断结果目前在提交响应和当前页面展示，后续可再做 Dashboard 最近一次补弱持久化视图。
- 没有修改知识卡 reviewer、publication status，也没有处理 release 模式现有 48 个教师内容 blocker。

## 下一步

继续做不依赖教师排版的工作：

1. 将 `missingTags` 和题目难度分布纳入 `/ops`/CI 的机器摘要，但保持语义标签缺口与教师审核 blocker 分离。
2. 为 Dashboard 增加最近一次 Foundation 诊断的只读摘要，让学生刷新页面后仍能看到补弱入口。
3. 对虚拟内存主题做一次真实浏览器验收，核对“引用 -> 小测 -> 诊断 -> 复习 -> 下一任务”在页面上的连续性。

