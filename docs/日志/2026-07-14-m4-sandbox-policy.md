# 工作日志：M4 Docker 沙箱策略固化

**日期**：2026-07-14  
**任务**：继续 M4 unit OJ 垂直切片，把生产级 Docker 沙箱的关键约束先固化成可审计配置与测试，作为后续真实 Docker worker 的基础。

## 完成内容

1. 新增沙箱策略模块
   - 新增 `lib/judge/sandbox.ts`。
   - 固化 `UNIT_JUDGE_SANDBOX`：
     - image：`opencamp/unit-judge-rust:2026-summer`
     - network：`none`
     - user：`1000:1000`
     - cpus：`1.0`
     - memory：`512m`
     - memory-swap：等同 memory
     - pids-limit：`64`
     - tmpfs：`/tmp:rw,noexec,nosuid,size=64m`
     - read-only rootfs
     - no-new-privileges
     - cap-drop ALL
     - pull never
     - log limit：`32 KiB`
     - time limit：`20s`
     - disk budget：`64 MiB`

2. Docker 命令参数构造
   - 新增 `buildDockerRunArgs`。
   - 输出 Docker 参数数组，而不是 shell 字符串，降低命令注入风险。
   - 支持只读 bind mount 与自定义 command。

3. 审计摘要与 verdict 分类
   - 新增 `summarizeSandboxPolicy`，worker 日志可记录资源限制摘要。
   - 新增 `classifySandboxExit`：
     - exit 0 → `AC`
     - timeout → `TLE`
     - compile/error → `CE`
     - oom/memory → `RE`
     - 其他失败 → `WA`

4. worker 日志接入
   - `scripts/unit-judge-worker.ts` 启动时输出执行模式。
   - 默认仍是 `local-rules` runner。
   - 设置 `JUDGE_EXECUTION_MODE=docker` 时会输出 Docker 沙箱策略摘要。
   - 每次回写 publicLog 时附带当前执行模式/沙箱说明，方便审计。

5. 测试
   - 新增 `tests/judge/sandbox.test.ts`：
     - 校验 Docker 参数包含无网络、只读根、非提权、cap drop、PID/内存/tmpfs/pull 限制；
     - 校验审计摘要包含关键限制；
     - 校验 sandbox exit 到 verdict 的映射。

## 关键设计边界

- 本步骤没有直接在当前环境执行 Docker。
- 当前 worker 仍默认使用本地规则 runner；Docker 沙箱执行器的真实 `spawn`、临时目录、题包挂载和镜像构建是下一步。
- 这一步的价值是先把安全策略变成代码和测试，避免后续实现 worker 时靠口头约定。

## 验证

- `npm run typecheck`：通过。
- `npm test`：通过，20 个测试文件 / 85 个测试。
- `npm run judge:unit`：通过；无 queued job 时安全退出，并输出 `mode=local-rules`。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现现有 LF/CRLF 提示，无 whitespace error。

## 后续

1. 实现真实 Docker worker 执行器：
   - 创建临时 workspace；
   - 写入提交文件和测试 harness；
   - 使用 `spawn('docker', args)` 执行；
   - 按 timeout 杀进程；
   - 截断 stdout/stderr；
   - 调用 `classifySandboxExit` 回写 verdict。
2. 为五个 unit gate 迁移到更接近 `cargo test` 的题包结构。
3. 增加 worker SE 自动重试和 lease 过期恢复。
