# 工作日志：M4 unit OJ 本地端到端 smoke

**日期**：2026-07-14  
**任务**：继续 M4 unit OJ 垂直切片，补一个可重复运行的本地端到端 smoke，验证“提交 → 入队 → worker → AC → gate passed/解锁下一关”闭环。

## 完成内容

1. 新增 smoke 脚本
   - 新增 `scripts/smoke-unit-oj.ts`。
   - 新增 npm script：
     - `npm run judge:smoke`

2. smoke 覆盖范围
   - 创建临时学员。
   - 初始化 gate progress。
   - 依次提交并判题五个基础 unit gate：
     1. `env-setup`
     2. `rustlings-variables`
     3. `rustlings-move`
     4. `rust-result`
     5. `basic-syscall-model`
   - 每关流程均经过：
     - `CodeSubmission(verdict=PENDING)`
     - `JudgeJob(status=queued)`
     - `runUnitJudge`
     - `completeJudgeJobFromWorker`
     - `LabGateProgress(status=passed)`
   - 五个 unit gate 全部 AC 后，验证 `lab1-batch` 自动解锁为 `unlocked`。
   - finally 中删除临时学员，避免污染 dev 数据。

3. smoke 输出
   - 每个 gate 输出 `AC → passed`。
   - 最后确认 `lab1-batch unlocked after five unit gates`。

## 验证

- `npm run judge:smoke`：通过。
- `npm run typecheck`：通过。
- `npm test`：通过，21 个测试文件 / 91 个测试。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现现有 LF/CRLF 提示，无 whitespace error。

## 关键设计边界

- 当前 smoke 使用本地 `local-rules` runner，不依赖 Docker daemon。
- 它验证的是 OJ 队列与 gate 解锁闭环，不等价于真实 Docker 沙箱验收。
- 真实 Docker 端到端仍需要在 Linux judge host 上构建镜像并运行 worker。

## 后续

1. 在 Linux/Docker judge host 上运行 Docker 版端到端 smoke。
2. 增加 worker health/metrics，为 M5 灰度和容量观测做准备。
