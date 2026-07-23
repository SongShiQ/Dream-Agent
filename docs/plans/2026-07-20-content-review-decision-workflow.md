# 教师内容审核决策与发布闭环方案

**日期**：2026-07-20  
**状态**：实施中  
**范围**：知识卡与参数化实验模板的审核决策、审计事件、CLI/CI 应用

## 目标

在保持 Git 文件为课程内容权威源的前提下，让教师可以从 `/ops` 提交可追踪的审核决策，并由本地 CLI 或 CI 在发布门禁通过后原子写入内容文件。网页本身不直接修改生产 Markdown/JSON，也不复用 Judge worker 凭证作为教师身份。

## 两阶段流程

1. 教师使用独立 `CONTENT_OPS_TOKEN` 和明确 actor，在 `/ops` 对知识卡或实验模板提交决策。
2. 服务端读取当前权威文件，验证目标、审计问题、状态转换与客户端提交的内容哈希。
3. 数据库写入 `ContentReviewDecision`，记录 actor、批注、before/after 状态、expected/proposed hash 和时间。
4. 教师/CI 先运行 dry-run 查看计划，再用 `--apply` 原子写入 Markdown frontmatter 或实验 JSON。
5. CLI 在写入前重新检查 expected hash，并用当前代码中的审计规则再次验证；内容或门禁已变化则标记 stale，不覆盖他人修改。
6. 应用成功后决策标记 applied，并清除 active key；Git diff 仍是最终评审和发布证据。

## 权限边界

- 只读运营队列继续使用现有 `x-judge-token`，避免破坏当前运维入口。
- 写入审核决策必须使用 `x-content-ops-token`；生产环境未配置 `CONTENT_OPS_TOKEN` 时拒绝启用。
- 每个写请求必须携带 `x-content-ops-actor`，禁止用匿名浏览器或固定“ops-dashboard”冒充教师。
- `request_changes` 必须写批注；所有 action 都保存审计事件。
- 决策不能写 mastery、Judge verdict、CodeSubmission 或 LabGateProgress。

## 状态转换

- `approve_review`：目标无 error 后，将 review 状态改为 reviewed，并写 reviewer/time。
- `publish`：仅当前已 reviewed 且发布审计无 error 时可排队。
- `deprecate`：将 publication 状态改为 deprecated，不删除内容。
- `request_changes`：只记录教师批注，不改变内容文件。

同一源文件同一时间最多一个 pending 决策。后续决策必须等前一个应用、失效或取消，避免审批顺序不明确。

## 并发与恢复

- `expectedHash` 防止基于旧页面覆盖新内容。
- `proposedHash` 证明 CLI 生成的目标内容与 API 审核时一致。
- 写文件使用同目录临时文件 + rename。
- 若文件已等于 `proposedHash` 但数据库尚未标记 applied，CLI 只补记状态，支持崩溃恢复。

## 非目标

- 本切片不直接创建 GitHub PR，也不自动 push/merge。
- 不允许 LLM 自动批准或发布内容。
- 不把 shared Judge token 解释为教师身份。
