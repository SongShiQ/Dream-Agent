# 工作日志 · M2 dashboard 收敛

**日期**：2026-07-14  
**任务**：继续 M2，把学习地图节点状态和右侧栏下一步建议收敛到 `/api/me/dashboard` 与 mastery 聚合，减少本地推断。

## 完成内容

- 更新 `lib/progress/mastery.ts`：
  - dashboard 的 gate 返回中补充 `stageIds`，让前端能把 gate mastered 证据映射回学习路径节点。
- 更新 `lib/learning/path.ts`：
  - `buildPathNodes` 支持 `masteredStages`；
  - 不再按 stage 顺序自动把当前位置之前的节点标为 `done`；
  - 只有存在 mastery 证据的 stage 才显示为 `done`。
- 更新 `tests/learning/path.test.ts`：
  - 测试“当前位置之前不自动 done”；
  - 测试“只有传入 masteredStages 的节点才 done”。
- 更新 `LearningMapPanel`：
  - 读取 `/api/me/dashboard`；
  - 根据 mastered gate 的 `stageIds` 渲染“已达标”节点；
  - 将旧文案“本章已走过 / 更早小节”改为“本章已达标 / 已达标”。
- 更新 `app/page.tsx` 右侧栏：
  - 优先展示 dashboard `primaryTask`；
  - 展示对应达标要求；
  - “卡住了”依据 dashboard weakPoints 进入薄弱点快练或问答；
  - dashboard 未加载时保留旧逻辑作为 fallback。

## 验证

- `npm run typecheck`：通过。
- `npm test`：16 个测试文件、69 个测试全部通过。
- `git diff --check`：通过；仅有既有 LF/CRLF warning。
- dev server 仍在 `http://localhost:3000` 运行。

## 关键结论

- 学习地图不再把“处在后续阶段”误当作“前序阶段已达标”。
- 右侧栏主建议与首页主卡使用同一个 dashboard 来源，减少学生看到多个互相竞争的下一步。
- `done` 在路径 UI 中现在表达“已达标”，不是“看过/走过”。

## 下一步

1. 进入 M3：实现 12 题诊断与六个导学微单元内容/规则。
2. M3 中需要把诊断从“直接更新阶段”进一步收敛为“推荐起点 + 微单元 mastery 证据”。
