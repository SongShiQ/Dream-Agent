# OpenKB 导入与发布门禁工作日志

**日期**：2026-07-19  
**状态**：导入与发布门禁已完成并验收；教师审核 UI 待后续切片

## 完成内容

- 新增 OpenKB `concepts/summaries/entities` 页面到课程卡片的单向导入库和 CLI。
- 通过 manifest 登记来源、课程版本、页面覆盖字段和课程关系；未知来源、空正文、重复 ID 会阻断计划。
- dry-run 默认只报告，不写文件；`--apply` 默认生成 `draft`；`--publish` 仅接受 reviewed 页面。
- 写入采用临时文件后 rename，索引来源注册表与标签映射同步更新。

## 验收计划

- 单元测试覆盖 dry-run、sourceMap、draft、publish gate、review provenance、unknown source 和稳定 ID 冲突。
- `npm test`：27 个文件、114 个测试全部通过。
- `npx tsc --noEmit --pretty false`：串行复验通过。
- `npm run build`：通过；既有动态 API 路由仍打印 `DYNAMIC_SERVER_USAGE` 日志，但构建退出码为 0。
- 用 OpenKB 仓库 `examples/commands/sample-wiki` 做真实 CLI 演练：dry-run 返回 4 个页面且不写文件；`--apply` 写出 4 个 draft 卡片；未复核 `--publish` 返回退出码 1；带 reviewer 信息的 `--publish` 写出 4 个 published 卡片并返回退出码 0。
- 临时输出卡片包含稳定 ID、课程版本、来源 ID、`reviewed_by` 和 `reviewed_at`；正式 `data/knowledge` 未被演练污染。

## 审核补强

- manifest 使用 Zod 做运行时结构校验，`pageTypes` 只能是 OpenKB 已知目录。
- OpenKB `sources:` 文件路径必须由 `sourceMap` 或课程默认来源显式映射，不能伪装成课程来源 ID。
- `--publish` 除 reviewed 状态外，还必须有 `reviewedBy` 与 `reviewedAt`。
- 重新导入同一卡片时会移除旧 tagMap 路径，再写入当前标签，避免索引漂移。
- 导入前扫描课程包现有 Markdown 的稳定 ID；相同 ID 归属其他路径时阻断导入。

## 限制

本轮没有把 OpenKB 作为在线服务部署，也没有实现教师审核 UI；这两个能力保留在下一条纵向切片。
