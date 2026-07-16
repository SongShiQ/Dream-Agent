# 工作日志：M5 前置 Judge Health / Metrics

**日期**：2026-07-14  
**任务**：从 M4 进入 M5 前置，补 worker/队列 health metrics，为灰度、容量和运营验收提供可观测性基础。

## 完成内容

1. 新增 metrics 聚合模块
   - 新增 `lib/judge/metrics.ts`。
   - 提供 `computeJudgeMetrics` 纯函数：
     - job 总数；
     - job 按状态计数；
     - expired lease 数；
     - 正在等待重试的系统错误 job 数；
     - queued age p50/p95；
     - run 总数；
     - run 按 verdict 计数；
     - run 按 status 计数；
     - run time p50/p95；
     - memory p50/p95。
   - 提供 `buildJudgeMetrics`，从最近 1000 条 `JudgeJob` / `JudgeRun` 聚合。

2. 新增只读 health API
   - 新增 `GET /api/judge/health`。
   - 使用现有 `x-judge-token` 保护。
   - 返回 `{ metrics }`。

3. 测试
   - 新增 `tests/judge/metrics.test.ts`：
     - 状态计数；
     - expired lease；
     - SE retrying 计数；
     - queued age p95；
     - verdict/status 分布；
     - time p95。

## 验证

- `npm run typecheck`：通过。
- `npm test`：通过，22 个测试文件 / 92 个测试。
- `npm run judge:smoke`：通过，五个 unit gate AC 后 lab1 解锁。
- `npm run judge:unit`：通过；无 queued job 时安全退出。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现现有 LF/CRLF 提示，无 whitespace error。

## 后续

1. 做 M5 灰度运行手册：
   - 内测 30 人；
   - 小规模基础组 200 人；
   - 导学全量 2000 人；
   - 专业 pilot 30–60 人。
2. 增加运营 dashboard / 风险队列：
   - 连续失败；
   - 长时间 queued/running；
   - 多次 SE；
   - 导学微单元停滞；
   - gate 卡点。
3. 在 Linux/Docker judge host 上做真实 Docker 端到端验证。
