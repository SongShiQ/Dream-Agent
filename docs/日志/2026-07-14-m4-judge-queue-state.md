# 工作日志：M4 unit OJ 队列与状态机

**日期**：2026-07-14  
**任务**：按 M4 unit OJ 垂直切片推进，先建立真实 worker 前必须具备的队列、运行记录与 AC 唯一过关路径。

## 完成内容

1. 新增判题队列数据模型
   - `JudgeJob`：记录提交对应的判题任务，状态包括 `queued / running / completed / failed / cancelled`。
   - `JudgeRun`：记录每次 worker 运行的 verdict、公共日志、原始日志、资源指标。
   - `CodeSubmission` 增加 `judgeJobs` / `judgeRuns` 关系。
   - 新增 migration：
     - `prisma/migrations/20260714083000_add_judge_queue/migration.sql`

2. unit OJ 提交流程
   - `/api/submit` 对 `judgeKind === "unit_oj"` 的 gate 不再返回 `STATIC`。
   - unit gate 提交会创建：
     - `CodeSubmission(verdict=PENDING, isPassed=false)`
     - `JudgeJob(status=queued)`
   - locked gate 返回 `423`，不会入队。
   - 仍保留内容空洞检查，空提交/纯注释不会进入队列。

3. 判题状态机 helper
   - 新增 `lib/judge/state.ts`：
     - `verdictCanPassGate`
     - `isFinalJudgeVerdict`
     - `truncateJudgeLog`
     - `queueJudgeJobForSubmission`
     - `finalizeJudgeJob`
   - `finalizeJudgeJob` 只接受最终 verdict：`AC / WA / CE / RE / TLE / SE`。
   - 只有 `verdict=AC` 会写 `CodeSubmission.isPassed=true` 并调用 `markGatePassedOnAc` 推进 `LabGateProgress`。
   - `PENDING` / `STATIC` 明确不能 finalize，也不能过关。

4. worker API 骨架
   - 新增 `GET /api/judge/jobs`：
     - 使用 `x-judge-token` 校验；
     - 领取一个 `queued` job；
     - 将 job 标记为 `running` 并设置 lease。
   - 新增 `POST /api/judge/jobs`：
     - 使用 `x-judge-token` 校验；
     - 回写 verdict 与日志；
     - 统一走 `finalizeJudgeJob`。
   - 本地开发默认 token 为 `dev-judge-token`；生产应配置 `JUDGE_WORKER_TOKEN`。

5. 测试
   - 新增 `tests/judge/state.test.ts`：
     - 只有 AC 可过关；
     - PENDING/STATIC 不是最终 verdict；
     - 公共日志会截断；
     - worker 不能用 PENDING 作为完成 verdict。

## 关键设计边界

- Web 服务只负责入队，不直接运行用户代码。
- unit OJ 的学员提交已经不再冒充静态反馈；真实结果等待 worker verdict。
- gate passed 的唯一自动路径仍是 `verdict=AC`。
- 当前仍未实现 Docker 沙箱执行器；这是下一步 worker 实体工作。

## 验证

- `npx prisma migrate deploy`：通过。
- `npx prisma generate`：通过。
- `npm run typecheck`：通过。
- `npm test`：通过，18 个测试文件 / 77 个测试。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现现有 LF/CRLF 提示，无 whitespace error。

## 后续

1. 实现最小 unit worker：
   - 读取 `JudgeJob`；
   - 针对 `env-setup / rustlings-variables / rustlings-move` 的题包执行受控检查；
   - 回写 `AC / WA / CE / RE / TLE / SE`。
2. 补 unit gate 题包目录与公开测试说明。
3. 前端 `LabPanel` 增加 PENDING/running 轮询、最近 JudgeRun 日志和队列提示。
