# 工作日志：M5 灰度运行手册与风险队列

**日期**：2026-07-14  
**任务**：继续 M5，补灰度运行手册和运营风险队列，让系统从“能跑”推进到“能运营”。

## 完成内容

1. 灰度运行手册
   - 新增 `docs/operations/2026-07-14-m5-grey-release-runbook.md`。
   - 明确四个阶段：
     - 内测 30 人；
     - 小规模基础组 200 人；
     - 导学全量 2,000 人；
     - 专业 pilot 30–60 人。
   - 写入每日检查清单：
     - 系统；
     - 学习；
     - 运营。
   - 写入事故处理流程：
     - worker 宕机 / 队列积压；
     - 大量 SE；
     - 错判申诉；
     - 题包回滚；
     - 身份泄露/越权。
   - 明确倒金字塔不是淘汰率 KPI，复盘重点是内容/环境/题目/基础问题导致的异常流失。

2. 风险队列聚合
   - 新增 `lib/ops/risk.ts`。
   - 系统风险：
     - `judge_expired_lease`
     - `judge_queue_backlog`
     - `judge_se_retry`
   - 学生风险：
     - `student_repeated_non_ac`
     - `foundation_repeated_fail`
     - `no_diagnostic`
   - 每条风险包含：
     - severity；
     - kind；
     - evidence；
     - nextAction；
     - studentId/studentName（如适用）。

3. 运营 API
   - 新增 `GET /api/ops/risk`。
   - 使用 `x-judge-token` 保护。
   - 返回风险队列总数、严重级别分布和风险明细。

4. 测试
   - 新增 `tests/ops/risk.test.ts`：
     - 连续非 AC；
     - 微单元多次失败；
     - 系统 expired lease / queue backlog / SE retry。

## 验证

- `npm run typecheck`：通过。
- `npm test`：通过，23 个测试文件 / 95 个测试。
- `npm run judge:smoke`：通过，五个 unit gate AC 后 lab1 解锁。
- `npm run judge:unit`：通过；无 queued job 时安全退出。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现现有 LF/CRLF 提示，无 whitespace error。

## 后续

1. 做运营 dashboard 或在现有页面接入 `/api/ops/risk`。
2. 增加 cohort 维度过滤和风险处理状态：
   - open；
   - acknowledged；
   - resolved；
   - ignored。
3. 准备 M5 灰度验收清单：30 人内测 → 200 人基础组 → 2,000 人导学全量。
