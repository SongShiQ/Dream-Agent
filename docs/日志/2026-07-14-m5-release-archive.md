# 2026-07-14 M5 真实 cohort 放量快照归档工具

## 背景

继续收束 M5 的最后硬项：真实 30 人内测数据需要导出灰度快照并归档到周复盘材料。此前已经有 `/ops` 页面、`/api/ops/release` 和 30 人演练脚本；本次新增命令行归档工具，方便真实 cohort 到位后直接生成 Markdown/JSON 证据。

## 变更

1. 新增 `scripts/archive-release-snapshot.ts`
   - 参数：
     - `--cohortId=<id>`，默认 `2026-summer-os-main`；
     - `--target=pilot_30|foundation_200|onboarding_2000`，默认 `foundation_200`；
     - `--docker-verified`，仅在 Linux Docker judge 主机 smoke 通过后使用；
     - `--outDir=<dir>`，默认 `docs/operations/release-reviews`；
     - `--dry-run`，只打印不写文件；
     - `--allow-small`，允许本地小样本调试。
   - 默认要求 cohort 至少 30 人；不足 30 人时拒绝归档，除非显式 `--allow-small`。
   - 归档 Markdown 包含人工复核记录栏，避免把 GO 当成自动放量授权。
   - 同时输出 JSON，保留机器可追踪的 snapshot、metrics 与 risk queue。

2. 新增 npm 命令
   - `npm run ops:release-archive`

3. 更新运营文档
   - `docs/operations/2026-07-14-m5-weekly-funnel-review-template.md`
     - 新增灰度验收快照归档章节。
   - `docs/operations/2026-07-14-m5-release-acceptance-checklist.md`
     - 将 dry-run 归档命令加入本地必跑检查。
     - 增加真实 30 人 cohort 归档命令说明。

## 验证

- `npm run ops:release-archive -- --cohortId=2026-summer-os-main --target=foundation_200 --dry-run --allow-small`：通过；当前默认 cohort 为 7 人，仅作为调试。
- `npm run typecheck`：通过。
- `npm test`：通过，24 files / 100 tests。
- `npm run judge:smoke`：通过，五个 unit gate 全部 AC，`lab1-batch` 解锁。
- `npm run ops:release-rehearsal`：通过，临时 30 人 cohort 快照生成成功。
- `npx prisma validate`：通过。
- `npm run judge:unit`：通过，无 queued job。
- 清理确认：`rehearsal students: 0`。
- `git diff --check`：通过；仅出现 Windows LF/CRLF 提示。

## 当前边界

- 本次只补齐真实 cohort 到位后的归档工具；当前数据库里的默认 cohort 只有 7 人，不能作为真实 30 人内测归档。
- Docker 实机验证仍需在 Linux judge host 上运行 `npm run judge:docker-smoke`。
- M5 完整完成仍需要：
  1. Linux Docker judge host smoke 通过；
  2. 真实 30 人 cohort 运行 `ops:release-archive` 并归档周复盘。

