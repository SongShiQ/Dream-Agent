# OpenCamp AI 助教

基于多 Agent 架构的 OS 训练营 AI 助教系统。

## 功能特性

- 🤖 **多 Agent 架构**：Router、Tutor、Assessor、Examiner、Planner
- 📊 **自适应出题**：根据学员水平动态调整难度
- 📚 **知识库检索**：OS 教材和代码库
- 📈 **进度跟踪**：学习计划和完成度
- 🔧 **灵活 LLM**：支持 OpenAI、Anthropic、本地模型

## 快速开始

### 1. 克隆项目

```bash
git clone <repo-url>
cd "Dream Agent"
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入：
- `DATABASE_URL` - PostgreSQL 连接字符串
- `OPENAI_API_KEY` - OpenAI API Key（可选）
- `ANTHROPIC_API_KEY` - Anthropic API Key（可选）

### 4. 初始化数据库

```bash
npx prisma migrate dev
npx tsx scripts/import-questions.ts
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 技术栈

- **框架**：Next.js 14 (App Router)
- **AI SDK**：Vercel AI SDK
- **数据库**：Supabase (pgvector + PostgreSQL)
- **UI**：shadcn/ui + Tailwind CSS
- **测试**：Vitest

## 目录结构

```
├── app/              # Next.js 应用
│   ├── api/          # API 路由
│   └── components/   # React 组件
├── lib/              # 核心库
│   ├── agents/       # Agent 实现
│   ├── tools/        # 工具实现
│   ├── llm/          # LLM 配置
│   ├── db/           # 数据库操作
│   └── adaptive/     # 自适应算法
├── prisma/           # 数据库迁移
├── data/             # 数据文件
└── tests/            # 测试文件
```

## Agent 说明

| Agent | 职责 | 触发词 |
|-------|------|--------|
| Router | 意图识别，路由调度 | 自动 |
| Tutor | 理论答疑 | 什么是、解释、为什么 |
| Assessor | 水平评估 | 评估、我的水平 |
| Examiner | 出题练习 | 出题、练习、做题 |
| Planner | 学习规划 | 计划、怎么学、进度 |

## 部署

### Vercel

1. Push 代码到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量
4. 部署

### 其他平台

```bash
npm run build
npm start
```

## 开发

### 运行测试

```bash
npm test
```

### 类型检查

```bash
npm run typecheck
```

### 代码检查

```bash
npm run lint
```

## 许可证

MIT
