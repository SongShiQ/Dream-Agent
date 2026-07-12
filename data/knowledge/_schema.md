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
---
```

无 frontmatter 时，系统仍按文件名与正文关键词检索。

## 建议结构

1. 定义  
2. 要点 / 对比表  
3. 常见误区  
4. 相关 lab / 延伸阅读  

## API

- `GET /api/knowledge?tag=process` — 按标签取卡片  
- `GET /api/knowledge?q=虚拟内存` — 关键词搜索  
- `POST /api/knowledge` `{ "query": "...", "tags": ["process"] }`  
