# 工作日志 · M2 学员首页主卡

**日期**：2026-07-14  
**任务**：按详细工作方案推进 M2，让学员打开默认首页后能看到“我的状态与下一步”，并消费 M1-C 的 `/api/me/dashboard` 聚合数据。

## 完成内容

- 新增 `components/StudentHomePanel.tsx`：
  - 调用 `/api/me/dashboard`；
  - 展示当前阶段、OJ gate 达标数、唯一主任务；
  - 展示达标清单，区分 `missing / viewed / personal_done / mastered`；
  - 提供“开始”和“卡住了”入口，复用现有 `lab / plan / chat / wrongbook` 导航。
- 在 `LearningMapPanel` 顶部接入 `StudentHomePanel`，保持登录后默认进入学习地图，但第一屏先看到状态主卡。
- 保留原“今日三步”和“大章路径”，避免本轮重写整个学习壳。

## 设计口径

- 主卡使用服务端 dashboard 聚合，不自行推断课程达标。
- `personal_done` 只表示个人完成态；主卡文案明确不等于课程达标。
- OJ gate 达标数来自 `LabGateProgress.status='passed'`，仍遵守 AC-only 规则。
- “卡住了”优先进入错题本；无薄弱点时进入问答。

## 验证

- `npm run typecheck`：通过。
- `npm test`：16 个测试文件、68 个测试全部通过。
- `git diff --check`：通过；仅有既有 LF/CRLF warning。
- `npm run dev`：已启动，Next.js ready，地址 `http://localhost:3000`。

## 注意事项

- 侧边栏“下一步建议”仍保留旧的本地推断逻辑；主路径已经由首页主卡接管，后续可继续收敛到 dashboard。
- 本轮没有新增视觉自动化截图；当前验证以类型、测试和 dev server 启动为主。
- `StudentHomePanel` 是 M2 的第一版主卡，后续可扩展本周节奏、风险状态、TA 求助入口。

## 下一步

1. 继续 M2：让侧边栏建议和学习地图节点状态也消费 dashboard/mastery 聚合，减少重复推断。
2. 之后进入 M3：12 题诊断与六个导学微单元的内容/规则实现。
