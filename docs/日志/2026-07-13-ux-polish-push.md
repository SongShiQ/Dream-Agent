# 开发日志 · UX 打磨汇总与云端推送

**日期**: 2026-07-13  
**仓库**: https://github.com/SongShiQ/Dream-Agent  
**分支**: `main`

## 背景

在 v0.2.0-camp-map 之后，根据学员使用反馈继续打磨：Lab 静态分、练习阅读与布局、会话历史、模式保活、收藏/上一题、AI 出题入口、内容壳文档，以及课前速览卡片体验。

## 本批改动摘要

### 1. Lab 静态分析诚实性
- 空代码 / 仅注释 / hello 占位不再 100 分
- `lib/analysis/baseline.ts` 实质内容检测 + scoreCap
- 提交 API 过短拒绝；占位低分封顶
- 测试：`tests/analysis/substance.test.ts`

### 2. 练习体验
- 解析 / 扩展阅读 Markdown 渲染（`MarkdownBody` + react-markdown）
- 知识 API 返回全文 `content`；扩展阅读默认折叠，下一题置顶
- 错题高亮正确项与「正确答案」行
- 课前速览默认折叠一行，不挡做题
- **上一题**（会话轨迹）+ **收藏夹**（localStorage）
- **AI 出一题**（`forceLlm`）显式入口；选择题答案规范化
- 默认 bank；无题提示 import

### 3. 智能问答
- 历史会话列表（最多 10 条）+ 删除 + 切换
- 新建会话自动裁剪最旧
- 助手消息 Markdown 渲染

### 4. 壳与内容
- 模式 keep-alive（切换不丢练习状态）
- 练习「退出练习」回地图
- 导学/基础章节入口（专项训练）
- `data/CONTENT_PACK.md`、`content:import` / `content:audit`
- import 支持更新已有题解析/答案
- 计划：`docs/plans/2026-07-13-content-shell-architecture.md`

## 产品约定（备忘）

- **固定题库** = 正式课主路径  
- **AI 出题** = 显式加练，带 `ai_generated`  
- **内容改课** = 改 `data/questions` + `data/knowledge` → import  
- 可移植性：壳可复用，学科配置尚未完全外置  

## 建议测试

1. 练习：判错见正确项；下一题不挡；收藏/上一题  
2. 专项：课前速览默认收起  
3. Lab：hello 低分  
4. 问答：历史 10 条  
5. `npm run content:audit`  

## 未入库

- 父目录 `D:\THU\BeiJing\训练营\docs\` 交接日志（不在 Dream-Agent 仓库）  
- `.env.local`、`prisma/dev.db`  
