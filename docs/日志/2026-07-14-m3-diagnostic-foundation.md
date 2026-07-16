# 工作日志：M3 诊断与导学微单元后端骨架

**日期**：2026-07-14  
**任务**：按详细工作方案推进 M3，先完成“12 题诊断只推荐、不晋级”与导学微单元进度聚合的可验证后端基础。

## 完成内容

1. 12 题诊断规则收口
   - 诊断规模固定为 12 题，抽题优先覆盖 OS 理论、Rust、读代码/工具链三个维度。
   - 诊断结果新增：
     - `recommendedStage`
     - `recommendedUnit`
   - 保留旧字段 `stage` 兼容现有报告组件，但语义改为“建议起点”，不再直接晋级。
   - `/api/assess` 提交诊断后只更新 `weakPoints`，不再写 `Student.currentStage`。

2. 答题记录判分一致性
   - 诊断写入 `AnswerRecord` 时改用统一的 `gradeAnswer` / `parseJsonArray`。
   - 避免同一答案在诊断评分与答题记录中出现不同判定。

3. 导学微单元 API 与聚合
   - 新增 `lib/foundation/units.ts`：
     - 读取 `data/curriculum/2026-summer-os/foundation-units.json`；
     - 根据 `AnswerRecord.question.knowledgePoints` 与单元 `quizTags` 聚合正确率；
     - 输出 `locked / missing / in_progress / mastered` 状态；
     - 按 `unlockAfter` 处理前置依赖。
   - 新增 `GET /api/foundation`：
     - 从当前 session 推导学员；
     - 返回六个导学微单元的状态、证据与必修完成概览。
   - `GET /api/me/dashboard` 聚合新增 `foundation`：
     - 必修微单元完成数；
     - 是否全部达标；
     - 推荐微单元与证据说明。

4. 测试补充
   - `tests/assess/diagnostic.test.ts` 增加：
     - 推荐阶段/推荐微单元断言；
     - 题目维度分类；
     - 薄弱点到微单元的映射。
   - 新增 `tests/foundation/units.test.ts`：
     - 前置单元未达标时锁定后继单元；
     - 仅当匹配小测证据达到阈值时才标记 mastered。

5. 学员端呈现
   - 新增 `components/FoundationUnitPanel.tsx`：
     - 展示六个导学微单元；
     - 标注 `待开始 / 进行中 / 未解锁 / 已达标`；
     - 高亮诊断推荐微单元；
     - 明确“诊断只推荐，达标看小测证据”。
   - `StudentHomePanel` 接入推荐导学微单元卡片与完整微单元列表。
   - 右侧“下一步建议”接入 dashboard 的导学推荐。
   - 旧文案“约 5 题”更新为“12 题”。

## 关键设计边界

- 诊断不是晋级证据，只能推荐起点和导学微单元。
- 微单元 mastered 来自服务端答题记录聚合，不来自页面点击。
- 当前微单元聚合复用 `AnswerRecord` 和题目知识点标签，是 M3 的后端最小闭环；后续还需要补专门 quiz session / attemptsPolicy / UI。

## 验证

- `npm run typecheck`：通过。
- `npm test`：通过，17 个测试文件 / 73 个测试。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现现有 LF/CRLF 提示，无 whitespace error。

## 后续

1. 继续 M3：补 `FoundationUnitPanel`，让学生能在首页/导学页看到推荐单元、达标条件与下一步。
2. 为微单元小测补充更明确的 session/attempt 结构，支持每日高 stakes 次数与换题集策略。
3. M3 UI 收口后，再进入 M4 unit OJ 垂直切片。
