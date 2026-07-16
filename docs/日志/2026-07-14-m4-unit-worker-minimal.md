# 工作日志：M4 最小 unit worker 与题包

**日期**：2026-07-14  
**任务**：继续 M4 unit OJ 垂直切片，在已有 JudgeJob/JudgeRun 队列基础上补最小可运行 unit worker 与基础 gate 题包。

## 完成内容

1. 新增 unit judge 题包
   - `data/judges/unit/env-setup.json`
   - `data/judges/unit/rustlings-variables.json`
   - `data/judges/unit/rustlings-move.json`
   - 题包采用公开规则形式，先覆盖：
     - 环境/工具链自检；
     - Rust 变量与可变性；
     - 所有权与移动/借用。

2. 新增最小 unit runner
   - `lib/judge/unit-runner.ts`
   - 支持：
     - 加载 gate 对应题包；
     - 检查 required / forbidden 公开规则；
     - 明显花括号不匹配返回 `CE`；
     - 规则不满足返回 `WA`；
     - 规则满足返回 `AC`；
     - 题包缺失返回 `SE`。

3. 新增一次性 worker 脚本
   - `scripts/unit-judge-worker.ts`
   - 新增 npm script：
     - `npm run judge:unit`
   - 行为：
     - 领取一个 queued `JudgeJob`；
     - 只处理 `unit_oj`；
     - 调用 `runUnitJudge`；
     - 通过 `completeJudgeJobFromWorker` 回写 verdict；
     - 仍统一走 `finalizeJudgeJob`，因此只有 `AC` 能推进 gate。

4. 测试
   - 新增 `tests/judge/unit-runner.test.ts`：
     - 满足公开规则返回 `AC`；
     - 缺少规则返回 `WA`；
     - 明显语法片段不完整返回 `CE`。

5. 学员端判题反馈
   - `GET /api/labs?gateId=...` 的最近提交记录增加 `testResult` 与 `judgeLog`。
   - `components/LabPanel.tsx` 更新：
     - unit gate 提交按钮改为“提交到 unit OJ 队列”；
     - 显示最近提交时间线；
     - 当存在 `PENDING` 提交时自动轮询单关详情与 gate dashboard；
     - 文案改为 PENDING 入队、AC 过关，STATIC/WA/CE/TLE 均不能单独过关。

## 关键设计边界

- 当前是最小受控 runner，不是 Docker 沙箱。
- 它用于打通 M4 状态机和基础 gate 体验；生产高并发/不可信代码执行仍需要后续 Docker worker。
- 所有过关路径仍受 `finalizeJudgeJob` 与 `markGatePassedOnAc` 约束，客户端不能自报通过。

## 验证

- `npm run typecheck`：通过。
- `npm test`：通过，19 个测试文件 / 80 个测试。
- `npm run judge:unit`：通过；无 queued job 时安全退出。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现现有 LF/CRLF 提示，无 whitespace error。

## 后续

1. `LabPanel` 增加 PENDING/running 轮询与 JudgeRun/判题日志展示。
2. 增加真实沙箱 worker：
   - Linux Docker；
   - 非 root；
   - 无网络；
   - CPU/内存/PID/磁盘限制；
   - 日志截断。
3. 扩充 unit gate 题包到 M4 计划的五个基础 gate。
