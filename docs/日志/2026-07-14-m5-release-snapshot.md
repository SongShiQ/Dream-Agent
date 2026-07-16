# 2026-07-14 M5 灰度验收快照

## 背景

继续推进 M5“灰度、容量与运营验收”。前序已经具备 judge health、风险队列、风险处理状态、cohort 筛选与风险导出；本次补齐“放量判断”层，让运营例会能基于统一快照判断 30→200→2,000 是否可推进。

## 变更

1. 灰度验收快照
   - 新增 `lib/ops/release.ts`。
   - 汇总 cohort 漏斗、judge 指标、风险队列，生成 `GO/HOLD` 决策和检查项。
   - 漏斗指标包括：
     - 学员数；
     - 完成诊断人数；
     - 开始导学微单元人数；
     - 有微单元达标记录人数；
     - 开始 unit OJ 人数；
     - 五个 unit gate 全部通过人数；
     - 项目候选人数。

2. 运营 API
   - 新增 `GET /api/ops/release`。
   - 继续使用 `x-judge-token` 保护。
   - 支持参数：
     - `cohortId`
     - `target=pilot_30|foundation_200|onboarding_2000`
     - `dockerVerified=true|false`
     - `format=json|md`
   - Markdown 导出可直接作为周会或放量评审材料归档。

3. 运营面板
   - `/ops` 新增“灰度验收快照”区域。
   - 支持选择 30 人内测、200 人基础组、2,000 人导学全量目标。
   - 展示 `GO/HOLD`、阻塞项、漏斗数字和逐项检查。
   - 支持导出 JSON 与周会 Markdown。

4. 运营文档
   - 更新 `docs/operations/2026-07-14-m5-release-acceptance-checklist.md`，要求放量前导出灰度验收快照。
   - 更新 `docs/operations/2026-07-14-m5-grey-release-runbook.md`，补充灰度验收快照的使用方式和 GO/HOLD 解释。

## 验证

- `npm run typecheck`：通过。
- `npm test`：通过，24 files / 100 tests。
- `npm run judge:smoke`：通过，五个 unit gate 全部 AC，`lab1-batch` 解锁。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现 Windows LF/CRLF 提示。
- `npm run judge:unit`：通过，无 queued job。

## 当前边界

- `dockerVerified` 只能由真实 Linux Docker 判题主机验证后传入；本地 Windows 验证不能替代生产 Docker worker 验收。
- `GO` 表示没有 hard blocker，不等于自动放量；warn 项仍需教学、运营、技术负责人确认。
- 真实 30 人内测数据尚未接入，因此 M5 仍未达到完整放量完成状态。

