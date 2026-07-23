# 教师知识审核队列工作日志

**日期**：2026-07-19  
**状态**：已完成只读审核切片并通过浏览器验收

## 完成内容

- 新增包含 draft/published/deprecated 的内部卡片枚举和来源注册表读取。
- 新增审核规则：来源、稳定 ID、正文、知识关系、Foundation 先修、Lab Gate、复核人和复核时间。
- 为旧 `os-theory/`、`rust/`、`cards/` 内容增加课程级路径来源默认值：OSTEP、Rust Book、rCore。
- `/api/ops/knowledge` 复用 `x-judge-token`，`/ops` 展示筛选、汇总和逐卡片问题详情。

## 验收

- 未授权 `/api/ops/knowledge`：401。
- 带 `dev-judge-token`：200，真实返回 23 张卡片、0 个 error、47 个 warning、0 个 publish-ready。
- 浏览器 `/ops`：显示“课程知识审核队列”，虚拟内存卡片显示 pending 复核警告，页面声明只读且不提供发布按钮。
- 全量测试：29 个文件、120 个测试通过；TypeScript 类型检查通过。

## 当前内容状态

现有 23 张卡片仍全部 `published + pending`，这是真实的课程审核债务，不应在汇报中包装成“已复核”。下一步应补齐教师审核和来源章节证据，再通过 OpenKB/manifest 发布流程逐批升级。
