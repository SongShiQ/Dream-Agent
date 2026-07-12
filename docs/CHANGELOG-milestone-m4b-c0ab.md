# Milestone 节点 · 母题主库 + 双端对齐 + 学习地图打磨

**日期**: 2026-07-13  
**仓库**: https://github.com/SongShiQ/Dream-Agent  
**建议 tag**: `v0.2.0-camp-map`（推送后可打）

## 产品形态

- **网页**：概念题 / 地图 / 错题 / 计划 / 报告  
- **VS Code + CLI**：lab 代码；**同一 Prisma student.id**  
- **题库**：训练营主线母题，db 约 **271** 题  

## 本节点能力

| 模块 | 内容 |
|------|------|
| M4b 题库 | `camp-00`…`camp-07` 母题 JSON + import |
| C0 | 设置页复制 ID；CLI init 强制绑定；status 对齐 |
| A | 卡住一键过关：1 卡片 + 3 题 |
| B | 今日三步绑 lab；路径语义修正 |
| UX | 报告确认下载；摸底下一步；计划自定义 |
| 今日三步完成态 | localStorage 按日打勾；快练完回地图 |

## 启动

```bash
npm run dev
npx tsx scripts/import-questions.ts
cd cli && npx tsx src/index.ts init --id <网页id> --name "姓名"
```

## 刻意未做

VS Code 扩展、RAG、Docker OJ、摸底按 stage 分层抽题。
