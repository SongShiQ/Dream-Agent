# 工作日志 · M1-A Prisma migration 与验证

**日期**：2026-07-14  
**任务**：按详细工作方案推进 M1-A，补齐当前 OJ schema 改动对应的独立 Prisma migration，并验证迁移链路。

## 完成内容

- 备份当前开发库到 `prisma/dev.db.backup-20260714-m1a`。
- 新增 migration：`prisma/migrations/20260714062000_add_lab_gate_progress_oj_state/migration.sql`。
- migration 覆盖：
  - `Student.assistantPathCompletedAt`；
  - `LabGateProgress`；
  - `CodeSubmission.gateId/verdict/judgeKind/judgeLog` 与相关索引；
  - `ChatSession`、`ChatMessage`；
  - `LabGateProgress(studentId, gateId)` 唯一约束。
- 人工修正 Prisma diff 生成的旧提交迁移策略：历史 `CodeSubmission` 统一迁为 `verdict='STATIC'`、`isPassed=false`，避免旧静态分析记录被误认为 OJ AC。
- 当前 `dev.db` 已提前具备新 schema，因此使用 `prisma migrate resolve --applied 20260714062000_add_lab_gate_progress_oj_state` 修复 migration history，而不是重复执行会冲突的 ALTER。
- 修复现有 typecheck/test 阻塞：
  - 静态 submit 不再比较不可能的 `STATIC === AC`；
  - `ExamPanel` 按钮事件包装；
  - AI 出题规范化类型收窄；
  - diagnostic 维度 Set 类型；
  - knowledge frontmatter 解析类型；
  - analysis suggestions 去重改为 `Array.from(new Set(...))`；
  - diagnostic 测试更新为细粒度 `basic_trap` 口径；
  - `tsconfig` 显式设置 `target: es2017`。

## 验证

- `npx prisma validate`：通过。
- `npx prisma generate`：通过。
- `npx prisma migrate status`：3 个 migrations，Database schema is up to date。
- `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url file:./m1a-shadow.db --exit-code`：No difference detected。
- `npx prisma migrate diff --from-url file:./prisma/dev.db --to-schema-datamodel prisma/schema.prisma --script`：empty migration。
- `npm run typecheck`：通过。
- `npm test`：14 个测试文件、61 个测试全部通过。
- `git diff --check`：通过；仅有既有 LF/CRLF warning。

## 注意事项

- 当前 Prisma provider 仍是 SQLite，M1-A 只完成开发库迁移链路补齐；正式 PostgreSQL 切换仍需后续 M1 环境分层单独处理。
- 工作区存在大量既有未提交改动，本轮未回滚或覆盖这些改动。
- `prisma/dev.db.backup-20260714-m1a` 是本次迁移前备份，按需保留或在确认稳定后移出仓库目录。

## 下一步

1. 进入 M1-B：实现可信身份与资源所有权边界，逐步停止信任客户端传入 `studentId`。
2. 继续补 `DailyTaskProgress` 与 dashboard/mastery 聚合，为 M2 学员首页做准备。
3. PostgreSQL provider 切换、数据迁移脚本和生产回滚方案应单独形成 M1 环境分层任务。
