# 工作日志：M4 容器内 unit-judge 与 harness

**日期**：2026-07-14  
**任务**：继续 M4 unit OJ 垂直切片，补容器内 `unit-judge` 命令、Docker image 上下文与可执行 harness，让 Docker executor 有真实容器契约。

## 完成内容

1. 扩展 unit judge spec
   - `UnitJudgeSpec` 新增可选 `harness` 字段：
     - `mode: "rust_single_file"`
     - `template`
     - `tests`
   - 本地 `rules` 仍保留，继续供 `local-rules` runner 使用。

2. 四个 Rust/unit gate 增加 harness
   - `data/judges/unit/rustlings-variables.json`
   - `data/judges/unit/rustlings-move.json`
   - `data/judges/unit/rust-result.json`
   - `data/judges/unit/basic-syscall-model.json`
   - harness 会把提交片段包装成临时 Rust crate 的 `src/lib.rs`，并运行 `cargo test --quiet --offline`。

3. 新增 Docker image 上下文
   - `docker/unit-judge/Dockerfile`
   - `docker/unit-judge/unit-judge.mjs`
   - `docker/unit-judge/README.md`
   - 构建命令：
     - `docker build -t opencamp/unit-judge-rust:2026-summer docker/unit-judge`

4. 容器内 unit-judge 契约
   - 命令格式：
     - `unit-judge --gate <gateId> --submission /workspace/submission.rs --spec /workspace/judge-spec.json`
   - 执行顺序：
     1. 校验参数；
     2. 读取提交与 judge spec；
     3. 检查 gateId 是否匹配；
     4. 先跑公开规则；
     5. 若配置 harness，则生成临时 Rust crate；
     6. 执行 `cargo test --quiet --offline`；
     7. 用进程 exit code 交给宿主 Docker executor 分类 verdict。

5. 测试
   - `tests/judge/unit-runner.test.ts` 增加：
     - 四个 Rust/unit gate 都提供 `rust_single_file` harness。
   - `tests/judge/docker-executor.test.ts` 增加：
     - Docker execution plan 与容器内 `unit-judge` contract 对齐。

## 关键设计边界

- 当前没有在本机 build/run Docker 镜像；只补齐镜像上下文和容器命令契约。
- `env-setup` 仍是 controlled output 规则，不需要 Rust harness。
- 当前 harness 还是最小 `cargo test` 包装，后续应逐步替换为更强的公开测试 + hidden tests。

## 验证

- `npm run typecheck`：通过。
- `npm test`：通过，21 个测试文件 / 88 个测试。
- `$env:JUDGE_EXECUTION_MODE='docker'; npm run judge:unit`：通过；无 queued job 时打印沙箱策略并安全退出。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现现有 LF/CRLF 提示，无 whitespace error。

## 后续

1. 在 Linux judge host 上实际 build Docker image，并用一条 queued job 做端到端验证。
2. 补 hidden test 分离机制，避免测试内容全部进入公开 spec。
3. 增加 worker lease 过期恢复和 SE 自动重试。
