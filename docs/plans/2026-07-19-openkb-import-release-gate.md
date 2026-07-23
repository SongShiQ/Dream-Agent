# OpenKB 导入与发布门禁方案

**日期**：2026-07-19  
**状态**：导入与发布门禁已实现并完成真实 CLI 验收；后续接教师审核 UI   
**范围**：教师/CI 离线知识生产，不改变学生在线 Tutor 架构

## 目标

将 OpenKB 的 `wiki/concepts` 与 `wiki/summaries` 产物转换为 Dream Agent 课程知识卡片，补齐稳定 ID、课程版本、来源注册表、Lab Gate 关系和发布状态。

## 不变量

1. 学生请求不启动 Python/OpenKB，不在热路径改写公共 Wiki。
2. 所有卡片必须拥有可解析的稳定 ID、非空正文和 manifest 中登记的来源引用。
3. 普通 `--apply` 只写 `draft`。
4. `--publish` 必须同时满足每个页面 `review_status=reviewed`，否则整个计划失败且不写文件。
5. 任何导入或知识引用都不能写 `mastered` 或 `LabGateProgress.passed`。

## 使用流程

```text
OpenKB 离线编译
  -> 教师填写/审核 manifest
  -> content:openkb dry-run
  -> Git diff + lint + 人工审核
  -> content:openkb --apply（draft）
  -> 复核通过后 --publish
  -> 学生默认检索 published 卡片
```

## 本轮实现

- `lib/knowledge/openkb-import.ts`：manifest、页面解析、来源校验、稳定 ID、课程卡片渲染、索引合并和原子写入。
- `scripts/import-openkb.ts`：dry-run/apply/publish/replace CLI。
- `data/knowledge/openkb-manifest.example.json`：虚拟内存主题样板 manifest。
- `tests/knowledge/openkb-import.test.ts`：dry-run、draft 写入、发布拦截、未知来源拦截。

## 后续

- 教师审核面板：逐卡片显示来源、差异、复核人和发布动作。
- CI 门禁：将 dry-run、关系完整性和学生可见卡片变更纳入 PR 检查。
- OpenKB 产物版本与课程版本绑定，支持回滚和 deprecated 迁移。

## 验收结论

- OpenKB 官方示例 Wiki 已通过 dry-run、draft apply、未复核发布失败、已复核发布成功四条真实命令路径。
- 27 个测试文件、114 个测试、TypeScript 类型检查和 Next.js 生产构建通过。
- 教师侧可以直接使用 CLI，但当前仍需要手工编辑 manifest；教师审核 UI 与 CI PR 门禁属于下一阶段。
