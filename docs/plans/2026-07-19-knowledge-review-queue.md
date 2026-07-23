# 教师知识审核队列方案

**日期**：2026-07-19  
**状态**：只读审核已完成；两阶段审核决策/CLI 应用已于 2026-07-20 实现  
**范围**：`/ops` 运营面板与受保护知识审计 API

## 目标

让教师/运营能够在不打开每个 Markdown 文件的情况下，看到课程知识包的发布状态、来源、关系完整性和复核证据，并明确哪些卡片可以进入下一次 CLI/Git 发布。

## 权限与边界

- API 复用现有 `x-judge-token` 运营边界；未授权请求返回 401。
- 本轮只读，不通过网页修改 Markdown、manifest 或 `published` 状态。
- 正式修改仍走 OpenKB manifest、`content:openkb`、Git diff 和教师审核；审核队列不能产生 mastery、Judge AC 或 Gate passed。

## 审计规则

`error` 会阻止发布：重复稳定 ID、空正文、未登记来源、悬空知识关系、未知 Lab Gate、缺失复核人/时间、非法复核时间。

`warning` 需要教师注意：pending 复核、published 但仍 pending、缺标签。

`info` 用于补全课程关系：尚未关联题目标签或 Lab Gate。

旧课程目录通过 `index.json.pathSourceDefaults` 采用保守路径级来源迁移；显式 `source_refs` 优先。Foundation 单元 ID 可作为合法先修目标，因此跨层关系不会被误判为悬空。

## 实现

- `lib/knowledge/review.ts`：卡片审计、过滤、发布就绪判定和汇总。
- `app/api/ops/knowledge/route.ts`：受保护只读 API。
- `app/ops/page.tsx`：审核筛选、状态汇总和逐卡片问题详情。
- `tests/knowledge/review.test.ts`、`tests/api/ops-knowledge.test.ts`：规则与鉴权测试。

## 2026-07-20 演进

- 已建立独立内容运营 token、显式 reviewer actor 和 `ContentReviewDecision` 审计模型。
- 网页可排队 approve/request changes/publish/deprecate 决策，但不直接改 Markdown。
- `content:apply-decisions` 在 CLI/CI 中校验 expected/proposed hash 后原子应用。
- 内容漂移会标 stale，Git diff 仍是最终人工发布证据。

## 后续

1. 将 dry-run 与内容审计结果纳入 CI PR 必需检查。
2. 支持生成 GitHub/GitLab PR，而不是由教师手工执行 apply 后提交。
3. 与 OpenKB 生成 diff、来源章节和人工批注关联，而不是只显示卡片摘要。
