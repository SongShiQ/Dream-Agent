# 工作日志 · 本地优先教学 Agent 方向冻结与干净提交

**日期**：2026-07-16  
**任务**：明确“参考 DeepTutor/LLM Wiki 做我们自己的教学 Agent”；评测本地即可；工作区干净 commit。

## 决策

1. 效果目标仍是 Wiki + Tutor 闭环 + 练习证据三层合体。  
2. **不绑定在线 OJ**；本地方便优先。  
3. 不换栈重写；在 Dream Agent 上做成“我们的”教学 Agent。  
4. 方向文档：`docs/research/2026-07-16-local-first-teaching-agent.md`。

## 提交策略

拆成干净 commit：

1. docs：调研、效果结论、本地优先方向、计划与日志  
2. data/schema：课程包、lab/judge 数据、Prisma 与迁移  
3. lib/scripts/tests：foundation / labs / judge / progress / auth / ops  
4. app/ui：API、页面组件、CLI、package 脚本

排除：`prisma/dev.db.backup-*` 本地备份。
