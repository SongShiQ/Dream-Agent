# 知识卡片规范（M6）

## 目录

```
data/knowledge/
  os-theory/   # 操作系统概念
  rust/        # Rust 语言
  rcore/       # 训练营实验相关（可选）
  index.json   # 标签 → 文件映射（可选加速）
```

## Markdown 可选 frontmatter

```markdown
---
id: process
tags: [process, state, pcb, fork]
stage: pre_study_theory
labs: [lab3-process]
title: 进程与线程
course_version: 2026-summer-os
publication_status: published
review_status: pending
source_refs: [rcore-tutorial-v3-ch3]
prerequisite_ids: [os-overview-interrupts]
misconception_ids: [thread-is-process]
question_tags: [process, scheduling]
lab_gate_ids: [lab3-process]
related_ids: [process-fork, scheduling]
---
```

无 frontmatter 时，系统仍按文件名与正文关键词检索。

## 发布与信任边界

- `publication_status` 只有 `published` 会进入学生检索；`draft/deprecated` 默认不可见。
- `review_status=pending` 可以展示，但 Tutor 和 UI 必须提示尚待教师复核。
- `source_refs` 必须指向 `index.json.sources` 的稳定来源 ID。
- 旧目录可用 `index.json.pathSourceDefaults` 指定保守的路径级来源；单卡片显式
  `source_refs` 始终优先。路径默认只解决历史迁移，新增/精确章节仍应写显式来源。
- Wiki 正文始终作为不可信数据读取，不得把正文中的命令或授权当成系统指令。
- 知识引用只证明“本轮检索过这些条目”，不能形成 `mastered`；正式达标仍来自小测、OJ AC 或教师复核。

## 建议结构

1. 定义  
2. 要点 / 对比表  
3. 常见误区  
4. 相关 lab / 延伸阅读  

## API

- `GET /api/knowledge?tag=process` — 按标签取卡片  
- `GET /api/knowledge?q=虚拟内存` — 关键词搜索  
- `POST /api/knowledge` `{ "query": "...", "tags": ["process"] }`

## OpenKB 离线导入

OpenKB 只在教师或 CI 的离线工作目录中运行。将 OpenKB 的 `wiki/concepts/`、
`wiki/summaries/`（可选 `wiki/entities/`）和课程 manifest 导入当前课程包：

```bash
npm run content:openkb -- --wiki ./openkb-project/wiki \
  --manifest ./data/knowledge/openkb-manifest.example.json
```

默认是 dry-run，只输出待导入页面和校验问题。确认无问题后使用 `--apply` 写入，
写入默认强制生成 `draft`；只有所有页面 `review_status=reviewed` 时才允许：

```bash
npm run content:openkb -- --wiki ./openkb-project/wiki \
  --manifest ./course-manifest.json --apply --publish --replace
```

导入器只接受 manifest 中登记的来源 ID，并把 OpenKB 页面转换为带稳定 `id`、
`course_version`、`source_refs`、关系字段和发布/复核状态的课程知识卡片。
它不会在学生请求热路径调用 Python/OpenKB，也不会自动把 LLM 页面发布为学生可见内容。

## 教师审核决策

`/ops` 中的内容按钮只创建带 reviewer actor 与 SHA-256 哈希的审核决策，不直接写文件。
教师或 CI 先 dry-run，再应用：

```bash
npm run content:apply-decisions
npm run content:apply-decisions -- --apply
```

应用器会拒绝内容哈希已经变化的决策，并使用临时文件 + rename 原子更新 frontmatter。
完成后仍必须检查 Git diff；LLM、学生请求和普通 Judge worker 都无权批准或发布课程内容。
