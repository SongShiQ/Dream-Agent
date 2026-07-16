# 工作日志：M5 风险处理状态闭环

**日期**：2026-07-14  
**任务**：继续 M5，给运营风险队列补处理状态，让风险项可以被 acknowledged / resolved / ignored，而不是每天重复刷屏。

## 完成内容

1. 新增数据模型
   - `prisma/schema.prisma` 新增 `RiskResolution`：
     - `riskId`
     - `status`
     - `note`
     - `handledBy`
     - `createdAt`
     - `updatedAt`
   - 新增 migration：
     - `prisma/migrations/20260714101000_add_risk_resolution/migration.sql`

2. 风险队列合并处理状态
   - `lib/ops/risk.ts` 中 `buildRiskQueue` 会读取 `RiskResolution`。
   - 动态计算出的风险项会合并已有 resolution。
   - 风险排序优先 open，其次按 high / medium / low。
   - 新增 `updateRiskResolution`。

3. API 更新
   - `POST /api/ops/risk`：
     - 使用 `x-judge-token` 保护；
     - 接收 `riskId`、`status`、`note`、`handledBy`；
     - 支持状态：
       - `open`
       - `acknowledged`
       - `resolved`
       - `ignored`
     - 更新后返回新的 risk queue。

4. 运营页面接入
   - `app/ops/page.tsx` 风险卡片显示当前处理状态。
   - 每个风险项可直接切换：
     - open
     - acknowledged
     - resolved
     - ignored
   - 更新后刷新风险队列。

## 验证

- `npx prisma migrate deploy`：通过。
- `npx prisma generate`：通过。
- `npm run typecheck`：通过。
- `npm test`：通过，23 个测试文件 / 95 个测试。
- `npm run judge:smoke`：通过，五个 unit gate AC 后 lab1 解锁。
- `npm run judge:unit`：通过；无 queued job 时安全退出。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现现有 LF/CRLF 提示，无 whitespace error。

## 后续

1. 给风险处理状态增加 operator 登录身份，而不是暂用 `ops-dashboard`。
2. 增加 cohort 过滤和风险状态过滤。
3. 补每周复盘导出：风险项、处理状态、处理时长和对应 gate/unit。
