# 工作日志 · M1-C 跨端个人进度与课程证据聚合

**日期**：2026-07-14  
**任务**：按详细工作方案推进 M1-C，建立服务端 `DailyTaskProgress`，并初步形成 `personal_done` 与 `mastered` 分离的 dashboard 聚合。

## 完成内容

- 新增 Prisma 模型 `DailyTaskProgress`，并新增 migration：
  - `prisma/migrations/20260714070000_add_daily_task_progress/migration.sql`
  - 唯一约束：`studentId + date + taskId`
  - 字段包含 `fingerprint`、`completedAt`、`createdAt`、`updatedAt`
- 新增 `lib/progress/daily.ts`：
  - `getDailyProgress`
  - `setTaskPersonalDone`
  - `resolveProgressDate`
  - 明确只记录 `personal_done`，不生成达标证据。
- 新增 `lib/progress/mastery.ts`：
  - `buildStudentDashboard`
  - 聚合当前阶段、统计、今日步骤、个人完成态、测评证据和 gate passed 状态；
  - 返回 `conditions`，区分 `missing / viewed / personal_done / mastered`。
- 新增 API：
  - `GET/PUT /api/me/daily-progress`
  - `GET /api/me/dashboard`
- 改造前端：
  - `LearningMapPanel` 的“今日三步”完成态改为服务端 `DailyTaskProgress`；
  - 文案明确“个人完成态不代表课程达标或 OJ 通过”；
  - `PlanPanel` checkbox 改为服务端同步，不再使用本机 localStorage 作为主状态；
  - `lib/learning/today-progress.ts` 保留本地 fallback，但主路径走 `/api/me/daily-progress`。
- 新增 `tests/progress/daily.test.ts`，覆盖日期解析、personal_done upsert、撤销和 fingerprint 过滤。

## 关键边界

- `DailyTaskProgress` 只表示个人待办完成，不能晋级。
- `LabGateProgress.status='passed'` 仍只能来自 OJ `AC` 或后续受保护的 judge complete 通道。
- dashboard 聚合会同时展示个人完成态和课程达标证据，但不把两者混为一谈。

## 验证

- `npx prisma migrate deploy`：成功应用 `20260714070000_add_daily_task_progress`。
- `npx prisma generate`：通过。
- `npx prisma migrate status`：4 个 migrations，Database schema is up to date。
- `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url file:./m1c-shadow.db --exit-code`：No difference detected。
- `npm run typecheck`：通过。
- `npm test`：16 个测试文件、68 个测试全部通过。
- `git diff --check`：通过；仅有既有 LF/CRLF warning。

## 注意事项

- `viewed` 目前只在 dashboard 条件里作为“有测评但未达标”的弱证据表达，尚未建立浏览事件表。
- `/api/me/dashboard` 是 M2 学员首页的数据基础，当前尚未接入新的 `StudentHomePanel`。
- PlanPanel 和 LearningMapPanel 仍接收 `studentId` prop，但服务端 API 已由 M1-B 的 session guard 控制，query/body `studentId` 只作为 dev fallback。

## 下一步

1. 进入 M2：实现“我的状态与下一步”主卡，让首页直接消费 `/api/me/dashboard`。
2. 让 LearningMapPanel 逐步从索引推断 `done` 转向 dashboard/mastery 聚合，避免把早期阶段自动显示为已达标。
3. 后续可补浏览事件表，将真实 `viewed` 与 `personal_done`、`mastered` 进一步分离。
