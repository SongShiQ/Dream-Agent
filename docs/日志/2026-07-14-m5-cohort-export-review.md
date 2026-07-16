# 2026-07-14 M5 cohort 筛选、风险导出与周复盘

## 背景

继续按“先 M5 灰度、容量与运营验收，再进入 M6”的顺序推进。前序 M5 已有 judge health、风险队列、运营面板与风险状态处理；本次补齐灰度运营更需要的 cohort 维度、风险筛选/导出和每周漏斗复盘材料。

## 变更

1. 学员 cohort/运营字段
   - 在 `Student` 增加 `cohortId`、`learningStatus`、`curriculumVersion` 默认字段。
   - 新增 migration：`20260714104000_add_student_cohort_ops_fields`。
   - 默认 cohort 为 `2026-summer-os-main`，避免破坏现有本地数据。

2. 风险队列筛选与导出
   - `lib/ops/risk.ts` 支持按 `severity`、`status`、`cohortId` 过滤。
   - 风险项补充 `cohortId`，便于 30→200→2000 分阶段运营。
   - `/api/ops/risk` 支持查询参数：
     - `severity=high|medium|low|all`
     - `status=open|acknowledged|resolved|ignored|all`
     - `cohortId=<id>`
     - `format=json|csv`
   - CSV 导出使用转义，避免备注或证据中的引号破坏表格。

3. 运营面板
   - `/ops` 增加风险筛选控件。
   - 增加 JSON/CSV 下载按钮，下载请求使用 `x-judge-token` header，不把 token 放入 URL。
   - 风险卡展示 cohortId，方便 TA 和运营定位灰度批次。

4. 运营文档
   - 新增 `docs/operations/2026-07-14-m5-weekly-funnel-review-template.md`。
   - 新增 `docs/operations/2026-07-14-m5-release-acceptance-checklist.md`。
   - 更新 M5 runbook，明确筛选/导出、复盘模板和 30→200→2000 放量证据。

## 验证

- `npx prisma migrate deploy`：通过，已应用 `20260714104000_add_student_cohort_ops_fields`。
- `npx prisma generate`：通过。
- `npx prisma validate`：通过。
- `npm run typecheck`：通过。
- `npm test`：通过，23 files / 97 tests。
- `npm run judge:smoke`：通过，五个 unit gate 全部 AC，`lab1-batch` 解锁。
- `npm run judge:unit`：通过，无 queued job。
- `git diff --check`：通过；仅出现 Windows LF/CRLF 提示。

## 当前边界

- 本次验证仍是本地 `local-rules` worker；真实 Linux Docker worker 需要在有 Docker 的判题主机上补验。
- M5 运营工具已更接近可灰度，但真实放量还需要一次 30 人内测数据回填与周复盘演练。
- M6 专业 integration OJ / rCore 整仓判题尚未开始。

