# 2026-07-14 M5 外部验收交接单

## 背景

继续按计划顺序执行。M5 本地工具链已经具备 readiness audit，但最终完成仍依赖外部事实：真实 Linux Docker judge host smoke 与真实 30 人 cohort 归档。本次把外部执行步骤整理为独立交接单，避免后续依赖聊天记录或口头说明。

## 变更

1. 新增 `docs/operations/2026-07-14-m5-external-validation-handoff.md`
   - 明确技术/运维、教学/运营、项目负责人三类角色的输入与产出。
   - 给出执行顺序：
     1. 代码与数据库准备；
     2. Linux Docker judge host smoke；
     3. 真实 30 人 cohort 快照归档；
     4. 最终 readiness audit。
   - 写明每一步预期输出与失败处理。
   - 明确证据保存位置：
     - Docker smoke 完整终端输出；
     - release archive Markdown；
     - release archive JSON；
     - readiness audit 输出；
     - 人工签字/豁免说明。
   - 明确禁止进入 M6 的情况。
   - 明确 M6 启动条件：
     `npm run ops:m5-readiness -- --cohortId=<真实 cohortId> --docker-verified --require-archive`
     必须输出 `READY_FOR_M6_PLANNING`。

2. 更新 M5 文档入口
   - `docs/operations/2026-07-14-m5-release-acceptance-checklist.md` 增加外部验收交接单链接。
   - `docs/operations/2026-07-14-m5-grey-release-runbook.md` 增加外部验收交接单链接。

## 验证

- `npm run ops:m5-readiness -- --cohortId=2026-summer-os-main`：按预期返回 `NOT_READY`。
  - fail：默认 cohort 只有 7 人；
  - fail：未传入 `--docker-verified`；
  - warn：尚无 release review 归档。
- `npm run typecheck`：通过。
- `git diff --check`：通过；仅出现 Windows LF/CRLF 提示。

## 当前判断

M5 不再缺“怎么验收”的工具或说明；剩余是必须由真实环境/真实数据提供的事实：

1. Linux Docker judge host 执行 `npm run judge:docker-smoke`；
2. 真实 30 人 cohort 执行 `npm run ops:release-archive -- --cohortId=<真实 cohortId> --target=foundation_200 --docker-verified`；
3. 最终执行 `npm run ops:m5-readiness -- --cohortId=<真实 cohortId> --docker-verified --require-archive` 并获得 `READY_FOR_M6_PLANNING`。

