# 出题规范（M4）

## 字段

| 字段 | 必填 | 说明 |
|------|------|------|
| type | 是 | choice \| fill |
| difficulty | 是 | 0–100：30 入门 / 50 中等 / 70 难 |
| knowledgePoints | 是 | 英文短标签，如 process、ownership |
| content | 是 | 题干中文 |
| options | choice 必填 | `["A. ...","B. ..."]` |
| answer | 是 | 字母或填空标准答案 |
| explanation | 是 | 解析，帮助理解 |
| stage | 建议 | pre_study_theory / pre_study_rust / basic / professional |

## 知识点词表（常用）

process, scheduling, state, fork, memory, virtual_memory, page_fault, inode, filesystem, concurrency, lock, spinlock, interrupt, trap, rust, ownership, borrow, lifetime, syscall, deadlock, ipc, thread

## 导入

```bash
npx tsx scripts/import-questions.ts
```

扫描 `data/questions/*.json`（跳过 `_` 开头），按 content 幂等跳过重复。
