# 教师内容审核决策与发布闭环工作日志

**日期**：2026-07-20  
**状态**：核心实现、CLI/API、桌面/窄屏浏览器验收与全量回归完成

## 完成内容

- 新增 `ContentReviewDecision`，记录目标、源路径、课程版本、action、actor、批注、before/after 状态、expected/proposed hash、状态与应用时间。
- 新增独立 `CONTENT_OPS_TOKEN` / `x-content-ops-token` 写入边界，生产环境未配置时返回 503。
- 所有写请求强制 `x-content-ops-actor`，客户端 body 不能伪造 reviewer。
- 知识卡和实验模板审核队列都返回 SHA-256 内容哈希。
- `/api/ops/content-decisions` 支持创建、查询和取消决策。
- `/ops` 增加教师内容身份、知识卡审核按钮、实验模板审核卡和最近决策列表。
- 新增 `content:apply-decisions`：默认 dry-run，`--apply` 后使用同目录临时文件 + rename 原子更新。

## 状态与门禁

- `approve_review`：目标无 error 才能排队，并写 reviewer/time。
- `publish`：当前必须 reviewed 且 publish-ready。
- `deprecate`：只改变发布状态，不删除内容。
- `request_changes`：至少 5 个字符批注，作为立即生效的审计记录，不改文件。
- 同一源文件同一时间只有一个 active pending 决策。
- expected hash 不匹配时 API 返回 stale；应用时内容漂移则决策标为 stale，绝不覆盖。
- proposed hash 与渲染结果不一致时阻断应用。
- CLI 应用前会重新运行当前版本审计规则；规则升级后出现新 error 的旧决策会标 stale。
- 文件已经是 proposed hash 时只补记 applied，支持写文件成功、数据库更新失败后的恢复。

## 真实 CLI 演练

以 `virtual-memory` 知识卡做本地演练：

1. 创建 `local-rehearsal` 的 `approve_review` 决策，状态 pending。
2. dry-run 返回 `would_apply`；文件仍为 `review_status: pending`，active key 保留。
3. `--apply` 返回 `applied`；文件出现 `review_status: reviewed`、reviewer 和时间。
4. 重新构建审核队列后，该卡 `publishReady=true` 且无 issue。
5. 文件按原始内容恢复，最终 SHA-256 与演练前完全一致：`0532954789ef2984119aaadeaaf6b664e9f306d84a16a7174f3ac05c14792a26`。
6. 临时数据库决策已删除，dry-run 最终返回 0 个 pending。

## 真实 API 演练

- `/api/ops/knowledge`：200，同时返回知识审核队列和 1 个实验模板。
- 创建批准决策：201 / pending。
- 内容决策列表：200，可见刚创建事件。
- 取消决策：200 / cancelled，active key 释放。
- `api-rehearsal` 临时事件随后已清理。

## 测试覆盖

- 独立开发/生产 token 行为和 actor 校验。
- 旧哈希、重复 pending、缺批注、pending 模板发布阻断。
- dry-run、原子 apply、Markdown frontmatter、实验 JSON provenance。
- 内容漂移标 stale，取消释放 active key。
- API 拒绝非法 hash/action，并只采用认证 header 中的 actor。

## 边界

- 网页不会直接写 Git 内容文件。
- 本切片不自动创建、push 或 merge PR。
- 内容审核决策不会产生 mastery、AC 或 Gate passed。

## 最终回归

- 全量 Vitest：37 个测试文件、153 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，`/api/ops/content-decisions` 为动态路由，`/ops` 客户端包构建成功。
- Prisma：12 个迁移，schema 最新。
- `content:apply-decisions` 最终 dry-run：0 个 pending。
- 清洁核对：`ContentReviewDecision=0`、临时 experiment attempt=0、演练知识卡 SHA-256 与开始前一致。
- `git diff --check`：无错误，仅 Windows LF/CRLF 提示。
- 已将 dashboard、daily-progress、report 显式声明为 `force-dynamic`；最终构建不再打印此前三个 `DYNAMIC_SERVER_USAGE` 噪声。
- 文件系统测试使用显式 I/O 依赖注入，避免 Node 24 + Vitest 1 下全局 mock `fs/promises` 污染测试工作进程；修复后全量套件稳定退出 0。

## `/ops` 真实浏览器验收

- 桌面端身份、筛选、23 张知识卡、1 个实验模板、决策列表和风险/放量区布局正常。
- 390×844 窄屏下身份输入、筛选、导出按钮和内容卡片按单列排列，无横向溢出。
- 保存的 Judge token、内容 token 和 reviewer actor 在刷新后可恢复，刷新按钮正确联动。
- 知识卡 `approve_review`：成功生成 pending 事件；重复请求由服务端 409 拒绝并显示中文错误；取消后状态变为 cancelled。
- 实验模板 `approve_review` 与取消流程通过；空 `request_changes` 批注被 400 阻断，合格批注形成 applied 审计记录且不改模板文件。
- 浏览器发现 pending 决策存在时原按钮仍可重复点击；已修复为显示蓝色提示并禁用 approve/request changes/publish/deprecate，复验通过。
- 验收共产生 4 条 `browser-reviewer` 事件，均已从本地数据库清理，最终无 pending 决策。
- Next 开发模式首次冷加载曾出现一次 `app/layout.js` chunk timeout；服务预热后新标签页无 console warning/error，生产构建不受影响。
- 开发日志还暴露 Google Fonts 在受限网络下重试失败；已移除 `next/font/google`，改用本地系统字体栈，避免 AgentOS 冷启动依赖外网。
