# 工作日志：M4 队列可靠性与 SE 重试

**日期**：2026-07-14  
**任务**：继续 M4 unit OJ 垂直切片，补 JudgeJob 队列可靠性：lease 过期恢复与系统错误有限重试。

## 完成内容

1. lease 过期恢复
   - 更新 `lib/judge/worker.ts`。
   - `leaseNextJudgeJob` 现在不仅能领取 `queued` job，也能回收：
     - `status = running`
     - `leaseUntil < now`
   - 领取时通过 `updateMany` 带条件更新，避免多个 worker 同时抢同一个 job。

2. SE 有限自动重试
   - 更新 `lib/judge/state.ts`。
   - 新增纯函数 `planJudgeJobAfterRun`，统一决定一次判题后：
     - attemptsAfter
     - shouldRetry
     - jobStatus
     - submissionVerdict
     - submissionPassed
     - runStatus
   - 当 verdict 为 `SE` 且未达到 `maxAttempts`：
     - 写入一条 `JudgeRun(status=system_error)`；
     - `JudgeJob.attempts += 1`；
     - `JudgeJob.status` 回到 `queued`；
     - 清空 lease；
     - `CodeSubmission.verdict` 保持 `PENDING`；
     - 不写 `isPassed`，不推进 gate。
   - 当 `SE` 达到重试上限：
     - job 进入 `completed`；
     - submission 最终 verdict 为 `SE`。

3. AC/非 AC 语义保持
   - `AC` 仍是唯一自动过关路径。
   - `WA / CE / RE / TLE` 不重试，直接完成并反馈学生。
   - `PENDING / STATIC` 仍不能作为 worker 完成 verdict。

4. 测试
   - `tests/judge/state.test.ts` 增加：
     - SE 未达上限时 requeue；
     - SE 达上限时 completed；
     - AC completed 且 passed。

## 验证

- `npm run typecheck`：通过。
- `npm test`：通过，21 个测试文件 / 91 个测试。
- `npm run judge:unit`：通过；无 queued job 时安全退出。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现现有 LF/CRLF 提示，无 whitespace error。

## 后续

1. 在 Linux/Docker 环境做一次真实端到端：
   - submit；
   - queued；
   - docker worker；
   - verdict；
   - AC 解锁下一关。
2. 增加 worker health/metrics：
   - queued/running/completed 数；
   - expired lease 数；
   - SE retry 次数；
   - p50/p95 判题时间。
