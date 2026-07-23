# Foundation 诊断刷新恢复与题库覆盖机器摘要工作日志

**日期**：2026-07-21  
**状态**：实现、真实数据重建、全量测试和生产构建均通过

## 本次目标

- 让学生提交 Foundation 小测后，即使刷新页面，仍能看到最近一次知识点错误归因和知识卡补弱建议。
- 将每个 Foundation 单元的标签覆盖与难度分布加入统一内容发布检查 JSON。
- 将“题量不足”与“语义标签尚未细标”分开：前者继续作为发布 blocker，后者只进入机器摘要，等待后续课程数据整理。
- 不新增数据库字段，不修改教师审核状态，不改变 mastery 证据规则。

## 诊断刷新恢复

### 数据来源

现有数据库已经保留完整重建链路：

```text
FoundationQuizAttempt
  -> AnswerRecord
  -> Question.knowledgePoints
  -> FoundationUnit.quizTags
  -> published KnowledgeCard tags / questionTags
```

因此本次没有新增迁移，也没有保存第二份诊断 JSON。

### 实现

- `buildFoundationDashboard` 读取最近 100 个 attempt，并一次性 include AnswerRecord 与 Question。
- 选取最近一个已提交且有答题记录的 attempt，复用 `buildFoundationQuizDiagnosis` 重建薄弱知识点。
- 复用 `selectFoundationRemediationCards` 重建学生可见知识卡建议。
- 返回 `latestDiagnosis`，包含 attemptId、submittedAt、unitId、weakPoints、recommendedCards、summary 和 nextAction。
- `buildStudentDashboard` 将同一结果纳入主 Dashboard 的 foundation 摘要。
- `FoundationUnitPanel` 加载 `/api/foundation` 时恢复 `latestDiagnosis`，开始新小测时清空旧诊断，提交后再次以数据库重建结果为准。
- 知识卡文件读取失败只降级为空推荐，不影响 Dashboard、分数或 mastery。

## 题库覆盖机器摘要

`FoundationQuestionCoverage` 新增：

- `tagCoverage[]`：每个 quiz tag 的基础阶段题目数。
- `uncoveredTags[]`：当前没有题目细标的语义标签。
- `difficulty`：该单元合格题目的 min、max、average。

统一 release check 新增：

- `summary.foundationUncoveredTags`。
- `details.foundationCoverage[]`。
- 数据库查询显式读取 Question difficulty。

语义标签缺口不进入 `issues[]`，因此不会与教师审核、题量不足等 blocker 混淆。

## 当前机器摘要

| 单元 | 合格题数 | 未覆盖标签 | 难度范围 / 平均 |
|---|---:|---|---|
| OS 总览与中断 | 26 | `os_overview` | 30–60 / 45 |
| 进程与调度 | 30 | 无 | 30–60 / 42 |
| 内存与虚存 | 21 | 无 | 30–60 / 44 |
| Rust 基础 | 52 | `variables`、`match` | 30–60 / 43 |
| 所有权与错误处理 | 28 | 无 | 20–60 / 41 |
| 工具链与读代码 | 10 | 无 | 35–55 / 46 |

汇总：`foundationUncoveredTags=3`，Foundation coverage issue 为 0。

## 真实刷新重建验收

临时创建 `foundation-refresh-rehearsal` 学生并完成一次 OS 总览 practice：

1. 提交全错答案后，提交响应返回 weakPoints=`interrupt, trap`，知识卡=`trap-syscall`。
2. 独立重新调用 `buildFoundationDashboard`，返回相同 attemptId、weakPoints 和知识卡。
3. 独立调用主 `buildStudentDashboard`，foundation.latestDiagnosis 返回同一个 attemptId 和 unitId。
4. 证明结果来自 AnswerRecord 重建，而不是客户端内存或提交响应缓存。
5. 临时学生、attempt、AnswerRecord、ReviewSchedule 已全部级联删除，残留均为 0。

## 自动化验证

- Foundation、覆盖审计、发布检查和 API 针对性测试：4 个文件、18 个测试通过。
- 全量 Vitest：41 个测试文件、169 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，22 个页面/路由正常生成。
- development release check：pass、0 error、49 warning、3 个 uncovered tags、0 foundation issue。

## 当前边界

- 最近诊断从已有证据重建，不新增“LLM 自报掌握度”或可由客户端伪造的状态。
- 只恢复最近一次已提交 attempt；更完整的诊断历史时间线仍未实现。
- `os_overview`、`variables`、`match` 是题目细标缺口，不代表对应单元完全没有题。
- release 模式现有教师内容 blocker 保持不变，本次没有批准或发布任何知识卡/实验模板。

## 下一步

- 使用真实浏览器验证页面刷新前后诊断区、知识卡引用、到期复习和主任务连续性。
- 将 `details.foundationCoverage` 接入 `/ops` 的只读工程视图，不增加教师排版工作。
- 后续整理三个 uncovered tags 时，通过题目数据修订和测试完成，不降低发布门槛。

