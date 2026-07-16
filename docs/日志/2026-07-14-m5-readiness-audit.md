# 2026-07-14 M5 readiness audit

## 背景

继续按计划顺序执行。M5 本地工具链已经覆盖 health、risk queue、risk resolution、ops dashboard、release snapshot、30 人演练、Docker 主机 smoke 脚本与真实 cohort 归档脚本；剩余项主要依赖真实 Linux Docker judge host 和真实 30 人内测数据。本次新增 readiness audit，避免用聊天记忆判断 M5 是否完成。

## 变更

1. 新增 `scripts/audit-m5-readiness.ts`
   - 检查 M5 必要文档是否存在；
   - 检查关键 npm script 是否存在；
   - 调用 `buildReleaseSnapshot` 检查指定 cohort 的漏斗与 hard blocker；
   - 检查指定 cohort 是否至少 30 人；
   - 检查是否传入 `--docker-verified`；
   - 检查是否存在 release review 归档；
   - 检查是否有 `rehearsal-30-*` 临时学员残留；
   - 输出 Markdown 表格和 `READY_FOR_M6_PLANNING` / `NOT_READY`。

2. 新增 npm 命令
   - `npm run ops:m5-readiness`

3. 更新 M5 放量验收清单
   - 将本地 readiness audit 加入必跑命令。
   - 明确进入 M6 规划前必须运行：
     `npm run ops:m5-readiness -- --cohortId=<真实 cohortId> --docker-verified --require-archive`
   - 该命令必须输出 `READY_FOR_M6_PLANNING`。

## 验证

- `npm run ops:m5-readiness -- --cohortId=2026-summer-os-main`：按预期返回 `NOT_READY`。
  - pass=12
  - warn=1
  - fail=2
  - fail 原因：
    1. 默认 cohort 当前只有 7 人，不满足真实内测 30 人；
    2. 未传入 `--docker-verified`，说明 Linux Docker judge host 尚未实机验收。
  - warn 原因：
    - 尚未找到 release review 归档。
- `npm run typecheck`：通过。
- `npm test`：通过，24 files / 100 tests。
- `npm run judge:smoke`：通过，五个 unit gate 全部 AC，`lab1-batch` 解锁。
- `npm run ops:release-rehearsal`：通过。
- `npm run ops:release-archive -- --cohortId=2026-summer-os-main --target=foundation_200 --dry-run --allow-small`：通过。
- `npx prisma validate`：通过。
- `npm run judge:unit`：通过，无 queued job。
- 清理确认：`rehearsal students: 0`。
- `git diff --check`：通过；仅出现 Windows LF/CRLF 提示。

## 当前判断

M5 本地实现与验收工具链已基本就绪，但 readiness audit 正确显示当前还不能进入 M6：

1. 需要真实 Linux Docker judge host 运行 `npm run judge:docker-smoke`；
2. 需要真实 30 人 cohort 运行 `npm run ops:release-archive -- --cohortId=<真实 cohortId> --target=foundation_200` 并归档；
3. 完成后再运行 `npm run ops:m5-readiness -- --cohortId=<真实 cohortId> --docker-verified --require-archive`。

