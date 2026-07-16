# 工作日志：M4 Docker worker 执行器骨架

**日期**：2026-07-14  
**任务**：继续 M4 unit OJ 垂直切片，在已固化 Docker 沙箱策略后，实现真实 Docker worker 执行器骨架，并保持本地规则 runner 可用。

## 完成内容

1. 新增 Docker 执行器模块
   - 新增 `lib/judge/docker-executor.ts`。
   - 支持：
     - 创建临时 workspace；
     - 写入 `submission.rs`；
     - 写入 `judge-spec.json`；
     - 生成 Docker 执行计划；
     - 使用 `spawn('docker', args)` 执行；
     - 按 `timeLimitMs` 超时 kill；
     - 截断 stdout/stderr；
     - 使用 `classifySandboxExit` 转换 verdict；
     - 执行结束后清理临时目录。

2. Docker 执行计划
   - 新增 `buildUnitDockerExecutionPlan`。
   - 生成：
     - workspace 路径；
     - submission/spec 文件路径；
     - docker 命令；
     - docker args；
     - 沙箱策略摘要。
   - Docker 内部约定命令为：
     - `unit-judge --gate <gateId> --submission /workspace/submission.rs --spec /workspace/judge-spec.json`

3. worker 双模式
   - `scripts/unit-judge-worker.ts` 支持：
     - 默认 `JUDGE_EXECUTION_MODE=local-rules`；
     - 设置 `JUDGE_EXECUTION_MODE=docker` 时走 `runUnitJudgeInDocker`。
   - 无 queued job 时，docker 模式只打印沙箱策略，不实际调用 Docker，方便本地安全启动检查。

4. 测试
   - 新增 `tests/judge/docker-executor.test.ts`：
     - 校验 Docker execution plan 包含 gate、submission、spec、policy summary；
     - 校验输出按 byte budget 截断。

## 关键设计边界

- 当前没有在本机实际执行 Docker 镜像，因为环境不一定具备 Docker daemon / 镜像。
- 但执行器已经具备真实 `spawn('docker', args)` 路径，后续只需补镜像与容器内 `unit-judge` 命令即可试跑。
- 默认 worker 仍使用 `local-rules`，避免开发环境因为 Docker 缺失而无法处理队列。

## 验证

- `npm run typecheck`：通过。
- `npm test`：通过，21 个测试文件 / 87 个测试。
- `npm run judge:unit`：通过，默认 `mode=local-rules`。
- `$env:JUDGE_EXECUTION_MODE='docker'; npm run judge:unit`：通过，输出 Docker 沙箱策略，无 queued job 时安全退出。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现现有 LF/CRLF 提示，无 whitespace error。

## 后续

1. 补 Docker image / container 内 `unit-judge` 命令实现。
2. 将五个 unit gate 的题包从公开规则升级为可执行的 cargo test harness。
3. 增加 lease 过期恢复、SE 自动重试与 worker 健康指标。
