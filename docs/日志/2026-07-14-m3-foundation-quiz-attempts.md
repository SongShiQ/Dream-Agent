# 工作日志：M3 导学微单元小测 attempt

**日期**：2026-07-14  
**任务**：补齐 M3 尾项，为导学微单元建立独立的小测 session/attempt 结构，避免普通练习记录被误用为晋级证据。

## 完成内容

1. 新增数据模型
   - 在 `prisma/schema.prisma` 新增 `FoundationQuizAttempt`。
   - `AnswerRecord` 增加可选 `foundationAttemptId`，每题答案仍可追溯到具体小测 attempt。
   - 新增 migration：
     - `prisma/migrations/20260714075000_add_foundation_quiz_attempt/migration.sql`

2. 微单元达标口径调整
   - `lib/foundation/units.ts` 的 `computeFoundationProgress` 改为基于 `FoundationQuizAttempt` 聚合。
   - 普通练习题不再能直接把微单元标为 `mastered`。
   - 单元状态仍保持：
     - `locked`
     - `missing`
     - `in_progress`
     - `mastered`

3. 小测 API 接入
   - `POST /api/foundation` 新增：
     - `action: "start"`：创建小测 attempt，并返回不含答案的题目；
     - `action: "submit"`：提交答案，写入 `AnswerRecord`，更新 attempt 的 `passed / failed`。
   - high-stakes 小测受 `foundation-units.json` 中 `highStakesAttemptsPerDay` 控制。
   - 若上一次 high-stakes 失败，并启用 `alternateSetRequiredAfterFailure`，下一次抽题会排除上一组题目。

4. 本地数据库与 Prisma Client
   - 已执行 `npx prisma migrate deploy`，本地 `dev.db` 应用新 migration。
   - 已执行 `npx prisma generate`。

5. 测试更新
   - `tests/foundation/units.test.ts` 改为使用 attempt 证据验证：
     - 前置单元未 passed 时后继单元 locked；
     - 只有 passed attempt 才能使单元 mastered；
     - failed attempt 仅显示 in_progress。

6. 前端小测流程
   - `components/FoundationUnitPanel.tsx` 接入 `POST /api/foundation`：
     - 单元卡片可直接开始 high-stakes 小测；
     - 页面内展示题目与选项/填空输入；
     - 提交后显示 passed/failed 结果；
     - 提交成功后重新拉取导学微单元进度。
   - locked 单元禁用“开始小测”。
   - 推荐单元按钮使用主按钮样式，帮助学员先做最该做的一项。

## 关键设计边界

- 微单元 mastered 只来自明确的小测 attempt，不来自页面点击，也不来自普通刷题。
- `AnswerRecord` 保留题目级审计，`FoundationQuizAttempt` 负责单元级达标判断。
- 当前实现先支持后端闭环；前端正式小测页面还未接入 start/submit 流程。

## 验证

- `npx prisma migrate deploy`：通过。
- `npx prisma generate`：通过。
- `npm run typecheck`：通过。
- `npm test`：通过，17 个测试文件 / 73 个测试。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现现有 LF/CRLF 提示，无 whitespace error。

## 后续

1. 如需更细运营能力，可继续补 attempt 历史、冷却倒计时与错因标签。
2. M3 已形成可操作闭环，下一步进入 M4 unit OJ 垂直切片：
   - `JudgeJob`
   - unit gate 题包
   - PENDING→verdict 状态机
   - AC 才写入 `LabGateProgress.passed`
