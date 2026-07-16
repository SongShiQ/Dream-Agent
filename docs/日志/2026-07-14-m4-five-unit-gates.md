# 工作日志：M4 五个基础 unit gate 补齐

**日期**：2026-07-14  
**任务**：继续 M4 unit OJ 垂直切片，把基础阶段从前三个演示 gate 补齐为计划中的五个 unit gate，并保证 lab1 只能在基础 unit gate 全部通过后解锁。

## 完成内容

1. 补齐基础五关链
   - 更新 `data/labs/gates.json`。
   - 当前五个基础 unit gate 顺序为：
     1. `env-setup`
     2. `rustlings-variables`
     3. `rustlings-move`
     4. `rust-result`
     5. `basic-syscall-model`
   - `lab1-batch` 的 `unlockAfter` 从 `rustlings-move` 调整为 `basic-syscall-model`。
   - 后续 lab 的 order 顺延，保持路径顺序清晰。

2. 新增两个 unit judge 题包
   - `data/judges/unit/rust-result.json`
     - 检查 `Result`、错误传播 `? / match`、`Ok / Err`。
     - 禁止 `unwrap()`、`expect(`、`todo!()`、`unimplemented!()`。
   - `data/judges/unit/basic-syscall-model.json`
     - 检查 syscall 抽象、dispatch/match、user/kernel/trap 边界。
     - 禁止占位实现。

3. 测试补充
   - `tests/labs/gates.test.ts` 增加 M4 五个 unit gate 链路测试：
     - 确认五个基础 gate 存在；
     - 确认 lab1 依赖 `basic-syscall-model`；
     - 确认前五个 `unit_oj` gate 顺序不被破坏。
   - `tests/judge/unit-runner.test.ts` 增加题包加载测试：
     - 确认五个基础 unit gate 都有对应 judge spec。

## 关键设计边界

- 继续沿用现有 alias：
  - `env-setup`
  - `rustlings-variables`
  - `rustlings-move`
- `required-gates.json` 中的目标 ID（如 `env-check`、`rust-variables`）暂作为课程契约保留；正式统一命名可在后续单独做 migration/alias normalizer。
- 这一步只补齐基础 gate 链和公开规则题包，不声称已经具备生产级 Docker 沙箱。

## 验证

- `npm run typecheck`：通过。
- `npm test`：通过，19 个测试文件 / 82 个测试。
- `npm run judge:unit`：通过；无 queued job 时安全退出。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现现有 LF/CRLF 提示，无 whitespace error。

## 后续

1. 继续 M4：实现 Docker 沙箱 worker 或至少生成可审计的 Docker run 配置与 worker 执行器。
2. 给五个 unit gate 补更接近真实 cargo test 的题包结构。
3. 对 gate ID alias 做统一策略，减少 `required-gates.json` 与 `gates.json` 的命名偏差。
