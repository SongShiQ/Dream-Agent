# OS 训练营 AI 助教 - 多 Agent 架构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于多 Agent 架构的 OS 训练营 AI 助教，支持自适应出题、理论答疑、实验指导、进度跟踪，用户可自选 LLM。

**Architecture:** 主从多 Agent 架构，Router Agent 调度 4 个专业 Agent (Assessor, Tutor, Examiner, Planner)。使用 Vercel AI SDK 实现流式输出和 function calling，Supabase pgvector 存储知识库，PostgreSQL 存储学员数据和题库。

**Tech Stack:** Next.js 14 (App Router), Vercel AI SDK, Supabase (pgvector + PostgreSQL), shadcn/ui, Tailwind CSS, LangGraph (Agent 编排)

---

## 文件结构

```
D:\THU\BeiJing\训练营\Dream Agent\
├── app/
│   ├── layout.tsx                    # 根布局
│   ├── page.tsx                      # 主页面
│   ├── api/
│   │   ├── chat/route.ts            # 聊天 API
│   │   ├── assess/route.ts          # 评估 API
│   │   ├── exam/route.ts            # 出题 API
│   │   └── plan/route.ts            # 计划 API
│   └── components/
│       ├── ChatPanel.tsx             # 聊天面板
│       ├── ExamPanel.tsx             # 出题面板
│       ├── ProgressPanel.tsx         # 进度面板
│       └── AssessmentReport.tsx      # 评估报告
├── lib/
│   ├── agents/
│   │   ├── router.ts                # 调度 Agent
│   │   ├── assessor.ts              # 评估 Agent
│   │   ├── tutor.ts                 # 答疑 Agent
│   │   ├── examiner.ts              # 出题 Agent
│   │   └── planner.ts               # 规划 Agent
│   ├── tools/
│   │   ├── search-knowledge.ts      # 知识库检索
│   │   ├── analyze-code.ts          # 代码分析
│   │   ├── check-progress.ts        # 进度查询
│   │   └── generate-hint.ts         # 提示生成
│   ├── llm/
│   │   ├── config.ts                # LLM 配置
│   │   ├── providers.ts             # Provider 实现
│   │   └── factory.ts               # LLM 工厂
│   ├── db/
│   │   ├── schema.ts                # 数据库 Schema
│   │   ├── student.ts               # 学员操作
│   │   ├── question.ts              # 题目操作
│   │   └── progress.ts              # 进度操作
│   ├── knowledge/
│   │   ├── index.ts                 # 知识库索引
│   │   └── embeddings.ts            # 向量化
│   └── adaptive/
│       ├── difficulty.ts            # 难度调整算法
│       └── diagnosis.ts             # 诊断性测试
├── prisma/
│   └── schema.prisma                # 数据库迁移
├── data/
│   ├── knowledge/                   # OS 教材
│   ├── codebase/                    # rCore 代码
│   └── questions/                   # 初始题库
├── tests/
│   ├── agents/                      # Agent 测试
│   ├── tools/                       # 工具测试
│   └── adaptive/                    # 自适应算法测试
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── .env.local                       # 环境变量
└── README.md
```

---

## 阶段 1: 核心框架 (第 1-2 周)

### Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`

- [ ] **Step 1: 初始化 Next.js 项目**

```bash
cd "D:\THU\BeiJing\训练营\Dream Agent"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

- [ ] **Step 2: 安装核心依赖**

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic zod prisma @prisma/client
npm install -D @types/node
```

- [ ] **Step 3: 创建根布局**

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OpenCamp AI 助教',
  description: 'OS 训练营多 Agent AI 助教系统',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: 创建主页面骨架**

```tsx
// app/page.tsx
export default function Home() {
  return (
    <main className="flex h-screen">
      <div className="flex-1 flex flex-col">
        <header className="border-b p-4">
          <h1 className="text-xl font-bold">OpenCamp AI 助教</h1>
        </header>
        <div className="flex-1 flex">
          <div className="flex-1 p-4">
            {/* 聊天区域 */}
            <p>聊天区域（待实现）</p>
          </div>
          <aside className="w-80 border-l p-4">
            {/* 侧边栏 */}
            <p>侧边栏（待实现）</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: 验证项目启动**

```bash
npm run dev
```
Expected: 项目在 http://localhost:3000 启动，显示主页面

- [ ] **Step 6: 提交**

```bash
git init
git add .
git commit -m "feat: 初始化 Next.js 项目"
```

---

### Task 2: 数据库设计与迁移

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db/schema.ts`
- Create: `.env.local`

- [ ] **Step 1: 创建 Prisma Schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 学员档案
model Student {
  id            String   @id @default(cuid())
  name          String
  currentStage  String   @default("pre_study_theory")
  weakPoints    String[] @default([])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // 关联
  assessments   Assessment[]
  answerRecords AnswerRecord[]
  learningPlan  LearningPlan?
}

// 水平评估
model Assessment {
  id          String   @id @default(cuid())
  studentId   String
  student     Student  @relation(fields: [studentId], references: [id])
  theory      Int      @default(0) // 0-100
  coding      Int      @default(0) // 0-100
  rust        Int      @default(0) // 0-100
  weakPoints  String[] @default([])
  assessedAt  DateTime @default(now())
}

// 题目
model Question {
  id              String   @id @default(cuid())
  type            String   // choice | fill | code | design
  difficulty      Int      @default(50) // 0-100
  knowledgePoints String[] @default([])
  content         String
  answer          String
  explanation     String
  createdAt       DateTime @default(now())

  // 关联
  answerRecords AnswerRecord[]
}

// 答题记录
model AnswerRecord {
  id          String   @id @default(cuid())
  studentId   String
  student     Student  @relation(fields: [studentId], references: [id])
  questionId  String
  question    Question @relation(fields: [questionId], references: [id])
  answer      String
  isCorrect   Boolean
  timeSpent   Int      // 秒
  answeredAt  DateTime @default(now())
}

// 学习计划
model LearningPlan {
  id                  String   @id @default(cuid())
  studentId           String   @unique
  student             Student  @relation(fields: [studentId], references: [id])
  currentStage        String
  dailyTasks          Json     @default("[]")
  weeklyGoals         String[] @default([])
  estimatedCompletion DateTime?
  lastAdjustedAt      DateTime @default(now())
}
```

- [ ] **Step 2: 创建环境变量文件**

```bash
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/os_agent"
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
```

- [ ] **Step 3: 创建数据库类型导出**

```typescript
// lib/db/schema.ts
export type { Student, Assessment, Question, AnswerRecord, LearningPlan } from '@prisma/client';

export type Stage = 
  | 'pre_study_theory'
  | 'pre_study_rust'
  | 'pre_study_tools'
  | 'basic'
  | 'professional'
  | 'project_intro'
  | 'project';

export const STAGE_LABELS: Record<Stage, string> = {
  pre_study_theory: '导学-理论',
  pre_study_rust: '导学-Rust',
  pre_study_tools: '导学-工具',
  basic: '基础阶段',
  professional: '专业阶段',
  project_intro: '项目先导',
  project: '项目阶段',
};
```

- [ ] **Step 4: 运行数据库迁移**

```bash
npx prisma migrate dev --name init
```

- [ ] **Step 5: 提交**

```bash
git add prisma/ lib/db/ .env.local
git commit -m "feat: 添加数据库 schema 和迁移"
```

---

### Task 3: LLM 配置系统

**Files:**
- Create: `lib/llm/config.ts`
- Create: `lib/llm/providers.ts`
- Create: `lib/llm/factory.ts`

- [ ] **Step 1: 定义 LLM 配置类型**

```typescript
// lib/llm/config.ts
export type LLMProvider = 'openai' | 'anthropic' | 'local' | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;  // 自定义 API 端点
  temperature?: number;
  maxTokens?: number;
}

// Agent 专用配置
export interface AgentLLMConfigs {
  router: LLMConfig;
  assessor: LLMConfig;
  tutor: LLMConfig;
  examiner: LLMConfig;
  planner: LLMConfig;
}

// 默认配置
export const DEFAULT_CONFIGS: AgentLLMConfigs = {
  router: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.3,
  },
  assessor: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.5,
  },
  tutor: {
    provider: 'anthropic',
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
  },
  examiner: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.8,
  },
  planner: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.5,
  },
};
```

- [ ] **Step 2: 实现 Provider 工厂**

```typescript
// lib/llm/providers.ts
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { LLMConfig } from './config';

export function createLLMProvider(config: LLMConfig) {
  switch (config.provider) {
    case 'openai':
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      })(config.model);
    
    case 'anthropic':
      return createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      })(config.model);
    
    case 'local':
      // Ollama 兼容 OpenAI API
      return createOpenAI({
        apiKey: 'ollama',
        baseURL: config.baseUrl || 'http://localhost:11434/v1',
      })(config.model);
    
    case 'custom':
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      })(config.model);
    
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}
```

- [ ] **Step 3: 创建 LLM 工厂**

```typescript
// lib/llm/factory.ts
import { createLLMProvider } from './providers';
import type { AgentLLMConfigs, LLMConfig } from './config';
import { DEFAULT_CONFIGS } from './config';

let configs: AgentLLMConfigs = { ...DEFAULT_CONFIGS };

export function updateLLMConfigs(newConfigs: Partial<AgentLLMConfigs>) {
  configs = { ...configs, ...newConfigs };
}

export function getLLMProvider(agentName: keyof AgentLLMConfigs) {
  const config = configs[agentName];
  if (!config.apiKey) {
    throw new Error(`API key not configured for agent: ${agentName}`);
  }
  return createLLMProvider(config);
}

export function getLLMConfigs(): AgentLLMConfigs {
  return { ...configs };
}
```

- [ ] **Step 4: 提交**

```bash
git add lib/llm/
git commit -m "feat: 添加 LLM 配置系统，支持多 Provider"
```

---

### Task 4: Router Agent 实现

**Files:**
- Create: `lib/agents/router.ts`
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: 定义 Agent 响应类型**

```typescript
// lib/agents/types.ts
export type AgentName = 'assessor' | 'tutor' | 'examiner' | 'planner';

export interface AgentResponse {
  agent: AgentName;
  content: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
}

export interface RouterDecision {
  intent: AgentName | 'multi';
  confidence: number;
  reasoning: string;
  params?: Record<string, unknown>;
}
```

- [ ] **Step 2: 实现 Router Agent**

```typescript
// lib/agents/router.ts
import { generateText } from 'ai';
import { getLLMProvider } from '../llm/factory';
import type { AgentName, RouterDecision } from './types';

const ROUTER_PROMPT = `你是一个意图识别专家。根据用户消息，判断应该调用哪个专业 Agent。

可用的 Agent：
- assessor: 评估学员水平，触发词包括"评估"、"我的水平"、"测试一下"
- tutor: 理论答疑，触发词包括"什么是"、"解释"、"为什么"、"怎么理解"
- examiner: 出题练习，触发词包括"出题"、"练习"、"测试"、"做题"
- planner: 学习规划，触发词包括"计划"、"怎么学"、"下一步"、"进度"

请返回 JSON 格式：
{
  "intent": "agent名称",
  "confidence": 0-1的置信度,
  "reasoning": "判断理由",
  "params": {} // 可选参数
}`;

export async function routeUserMessage(message: string): Promise<RouterDecision> {
  const llm = getLLMProvider('router');
  
  const result = await generateText({
    model: llm,
    prompt: `${ROUTER_PROMPT}\n\n用户消息: ${message}`,
    temperature: 0.3,
  });

  try {
    const decision = JSON.parse(result.text) as RouterDecision;
    return decision;
  } catch {
    // 默认路由到 tutor
    return {
      intent: 'tutor',
      confidence: 0.5,
      reasoning: '无法解析意图，默认路由到答疑 Agent',
    };
  }
}
```

- [ ] **Step 3: 创建聊天 API 路由**

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { routeUserMessage } from '@/lib/agents/router';
import { getLLMProvider } from '@/lib/llm/factory';
import type { AgentName } from '@/lib/agents/types';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];

  // 路由决策
  const decision = await routeUserMessage(lastMessage.content);

  // 根据意图选择 Agent
  const agentName: AgentName = decision.intent === 'multi' ? 'tutor' : decision.intent;
  const llm = getLLMProvider(agentName);

  // 流式输出
  const result = await streamText({
    model: llm,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    system: getAgentSystemPrompt(agentName),
  });

  return result.toDataStreamResponse();
}

function getAgentSystemPrompt(agent: AgentName): string {
  const prompts: Record<AgentName, string> = {
    assessor: '你是 OS 训练营的评估专家。通过提问评估学员的操作系统知识水平。',
    tutor: '你是 OS 训练营的答疑助教。耐心解答学员的问题，引导他们思考而非直接给答案。',
    examiner: '你是 OS 训练营的出题专家。根据学员水平生成针对性的练习题。',
    planner: '你是 OS 训练营的学习规划师。帮助学员制定和调整学习计划。',
  };
  return prompts[agent];
}
```

- [ ] **Step 4: 提交**

```bash
git add lib/agents/ app/api/
git commit -m "feat: 实现 Router Agent 和聊天 API"
```

---

### Task 5: 基础聊天界面

**Files:**
- Create: `app/components/ChatPanel.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: 安装 UI 依赖**

```bash
npx shadcn@latest init
npx shadcn@latest add button input card scroll-area
```

- [ ] **Step 2: 实现聊天面板组件**

```tsx
// app/components/ChatPanel.tsx
'use client';

import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message.id} className={message.role === 'user' ? 'ml-12' : 'mr-12'}>
              <CardContent className="p-3">
                <p className="text-sm font-medium mb-1">
                  {message.role === 'user' ? '你' : 'AI 助教'}
                </p>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </CardContent>
            </Card>
          ))}
          {isLoading && (
            <Card className="mr-12">
              <CardContent className="p-3">
                <p className="text-sm text-muted-foreground">思考中...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="输入你的问题..."
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading}>
          发送
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: 更新主页面**

```tsx
// app/page.tsx
import { ChatPanel } from './components/ChatPanel';

export default function Home() {
  return (
    <main className="flex h-screen">
      <div className="flex-1 flex flex-col">
        <header className="border-b p-4">
          <h1 className="text-xl font-bold">OpenCamp AI 助教</h1>
          <p className="text-sm text-muted-foreground">多 Agent 架构 · 自适应学习</p>
        </header>
        <div className="flex-1 flex">
          <div className="flex-1">
            <ChatPanel />
          </div>
          <aside className="w-80 border-l p-4">
            <h2 className="font-semibold mb-4">快捷功能</h2>
            <div className="space-y-2">
              <button className="w-full text-left p-2 rounded hover:bg-muted">
                📊 评估水平
              </button>
              <button className="w-full text-left p-2 rounded hover:bg-muted">
                📝 开始练习
              </button>
              <button className="w-full text-left p-2 rounded hover:bg-muted">
                📈 查看进度
              </button>
              <button className="w-full text-left p-2 rounded hover:bg-muted">
                📋 学习计划
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: 验证聊天功能**

```bash
npm run dev
```
Expected: 页面显示聊天界面，可以发送消息并收到 AI 回复

- [ ] **Step 5: 提交**

```bash
git add app/components/ app/page.tsx
git commit -m "feat: 添加基础聊天界面"
```

---

## 阶段 2: 专业 Agent (第 3-4 周)

### Task 6: Tutor Agent (答疑)

**Files:**
- Create: `lib/agents/tutor.ts`
- Create: `lib/tools/search-knowledge.ts`
- Create: `lib/tools/analyze-code.ts`

- [ ] **Step 1: 实现知识库检索工具**

```typescript
// lib/tools/search-knowledge.ts
import { tool } from 'ai';
import { z } from 'zod';

export const searchKnowledgeTool = tool({
  description: '检索 OS 教材、讲义、参考资料',
  parameters: z.object({
    query: z.string().describe('检索关键词'),
    topic: z.enum(['process', 'memory', 'filesystem', 'interrupt', 'concurrency']).optional(),
  }),
  execute: async ({ query, topic }) => {
    // TODO: 实际实现需要连接 pgvector
    // 这里返回模拟数据
    return {
      results: [
        {
          content: `关于 "${query}" 的知识：页表是操作系统内存管理的核心数据结构...`,
          source: 'rCore-Tutorial Chapter 4',
          relevance: 0.95,
        },
      ],
    };
  },
});
```

- [ ] **Step 2: 实现代码分析工具**

```typescript
// lib/tools/analyze-code.ts
import { tool } from 'ai';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const analyzeCodeTool = tool({
  description: '分析 rCore/xv6 代码，解释函数、追踪调用链',
  parameters: z.object({
    file_path: z.string().describe('源文件路径'),
    function_name: z.string().optional().describe('指定函数名'),
    question: z.string().describe('学员的问题'),
  }),
  execute: async ({ file_path, function_name, question }) => {
    try {
      const codebasePath = process.env.CODEBASE_PATH || './data/codebase';
      const fullPath = join(codebasePath, file_path);
      const content = await readFile(fullPath, 'utf-8');
      
      // 简单的代码分析（实际应该用 AST 解析）
      const lines = content.split('\n');
      const totalLines = lines.length;
      
      let relevantCode = content;
      if (function_name) {
        // 查找函数位置
        const funcIndex = lines.findIndex(l => l.includes(`fn ${function_name}`));
        if (funcIndex !== -1) {
          relevantCode = lines.slice(funcIndex, funcIndex + 30).join('\n');
        }
      }

      return {
        file: file_path,
        totalLines,
        relevantCode: relevantCode.slice(0, 2000), // 限制长度
        analysis: `文件 ${file_path} 包含 ${totalLines} 行代码。`,
      };
    } catch (error) {
      return {
        error: `无法读取文件: ${file_path}`,
      };
    }
  },
});
```

- [ ] **Step 3: 实现 Tutor Agent**

```typescript
// lib/agents/tutor.ts
import { generateText } from 'ai';
import { getLLMProvider } from '../llm/factory';
import { searchKnowledgeTool } from '../tools/search-knowledge';
import { analyzeCodeTool } from '../tools/analyze-code';

const TUTOR_SYSTEM_PROMPT = `你是 OpenCamp 训练营的答疑助教。

你的职责：
1. 耐心解答学员关于操作系统的问题
2. 引导学员思考，而不是直接给答案
3. 引用具体的教材和代码来源
4. 使用中文回答

回答风格：
- 先确认理解学员的问题
- 用简单的例子解释复杂概念
- 引导学员自己发现答案
- 提供相关参考资料`;

export async function tutorAgent(question: string) {
  const llm = getLLMProvider('tutor');

  const result = await generateText({
    model: llm,
    prompt: question,
    system: TUTOR_SYSTEM_PROMPT,
    tools: {
      searchKnowledge: searchKnowledgeTool,
      analyzeCode: analyzeCodeTool,
    },
    maxSteps: 3, // 允许多次工具调用
  });

  return result.text;
}
```

- [ ] **Step 4: 提交**

```bash
git add lib/agents/tutor.ts lib/tools/
git commit -m "feat: 实现 Tutor Agent 和知识检索工具"
```

---

### Task 7: Assessor Agent (评估)

**Files:**
- Create: `lib/agents/assessor.ts`
- Create: `lib/db/student.ts`

- [ ] **Step 1: 实现学员数据库操作**

```typescript
// lib/db/student.ts
import { PrismaClient } from '@prisma/client';
import type { Student, Assessment, Stage } from './schema';

const prisma = new PrismaClient();

export async function getOrCreateStudent(name: string): Promise<Student> {
  // 简单实现：用名字查找，实际应该用训练营学号
  let student = await prisma.student.findFirst({ where: { name } });
  
  if (!student) {
    student = await prisma.student.create({
      data: { name },
    });
  }
  
  return student;
}

export async function updateStudentLevel(
  studentId: string,
  assessment: Omit<Assessment, 'id' | 'studentId' | 'assessedAt'>
): Promise<Assessment> {
  return prisma.assessment.create({
    data: {
      studentId,
      ...assessment,
    },
  });
}

export async function getStudentProgress(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      assessments: { orderBy: { assessedAt: 'desc' }, take: 1 },
      answerRecords: { orderBy: { answeredAt: 'desc' }, take: 10 },
      learningPlan: true,
    },
  });
  return student;
}
```

- [ ] **Step 2: 实现 Assessor Agent**

```typescript
// lib/agents/assessor.ts
import { generateObject } from 'ai';
import { z } from 'zod';
import { getLLMProvider } from '../llm/factory';
import { getOrCreateStudent, updateStudentLevel } from '../db/student';

const AssessmentResultSchema = z.object({
  theory: z.number().min(0).max(100).describe('理论水平'),
  coding: z.number().min(0).max(100).describe('编码能力'),
  rust: z.number().min(0).max(100).describe('Rust 水平'),
  weakPoints: z.array(z.string()).describe('薄弱知识点'),
  summary: z.string().describe('评估总结'),
});

export async function assessStudent(name: string, answers: string[]) {
  const student = await getOrCreateStudent(name);
  const llm = getLLMProvider('assessor');

  const { object } = await generateObject({
    model: llm,
    schema: AssessmentResultSchema,
    prompt: `评估学员 "${name}" 的操作系统知识水平。

学员回答了以下诊断性问题：
${answers.map((a, i) => `${i + 1}. ${a}`).join('\n')}

请根据回答质量评估各维度分数（0-100）和薄弱知识点。`,
  });

  // 保存评估结果
  await updateStudentLevel(student.id, {
    theory: object.theory,
    coding: object.coding,
    rust: object.rust,
    weakPoints: object.weakPoints,
  });

  return {
    studentId: student.id,
    assessment: object,
  };
}
```

- [ ] **Step 3: 提交**

```bash
git add lib/agents/assessor.ts lib/db/student.ts
git commit -m "feat: 实现 Assessor Agent 和学员数据操作"
```

---

### Task 8: Examiner Agent (出题)

**Files:**
- Create: `lib/agents/examiner.ts`
- Create: `lib/db/question.ts`
- Create: `lib/adaptive/difficulty.ts`

- [ ] **Step 1: 实现难度调整算法**

```typescript
// lib/adaptive/difficulty.ts
export interface DifficultyParams {
  currentDifficulty: number;  // 0-100
  recentAccuracy: number;     // 最近正确率
  consecutiveCorrect: number; // 连续正确数
  consecutiveWrong: number;   // 连续错误数
}

export function adjustDifficulty(params: DifficultyParams): number {
  const { currentDifficulty, recentAccuracy, consecutiveCorrect, consecutiveWrong } = params;

  let adjustment = 0;

  // 连续正确 3 题以上，提升难度
  if (consecutiveCorrect >= 3) {
    adjustment += 10;
  }

  // 连续错误 2 题以上，降低难度
  if (consecutiveWrong >= 2) {
    adjustment -= 15;
  }

  // 正确率高于 80%，提升难度
  if (recentAccuracy > 0.8) {
    adjustment += 5;
  }

  // 正确率低于 50%，降低难度
  if (recentAccuracy < 0.5) {
    adjustment -= 10;
  }

  // 限制在 0-100 范围
  return Math.max(0, Math.min(100, currentDifficulty + adjustment));
}

export function getDifficultyLabel(difficulty: number): string {
  if (difficulty < 30) return '简单';
  if (difficulty < 60) return '中等';
  if (difficulty < 80) return '困难';
  return '专家';
}
```

- [ ] **Step 2: 实现题目数据库操作**

```typescript
// lib/db/question.ts
import { PrismaClient } from '@prisma/client';
import type { Question } from './schema';

const prisma = new PrismaClient();

export async function getQuestionsByDifficulty(
  difficulty: number,
  knowledgePoints: string[],
  limit: number = 5
): Promise<Question[]> {
  // 获取接近目标题目难度的题目
  return prisma.question.findMany({
    where: {
      difficulty: {
        gte: difficulty - 10,
        lte: difficulty + 10,
      },
      knowledgePoints: {
        hasSome: knowledgePoints,
      },
    },
    take: limit,
    orderBy: { difficulty: 'asc' },
  });
}

export async function saveAnswerRecord(
  studentId: string,
  questionId: string,
  answer: string,
  isCorrect: boolean,
  timeSpent: number
) {
  return prisma.answerRecord.create({
    data: {
      studentId,
      questionId,
      answer,
      isCorrect,
      timeSpent,
    },
  });
}

export async function getStudentStats(studentId: string) {
  const records = await prisma.answerRecord.findMany({
    where: { studentId },
    orderBy: { answeredAt: 'desc' },
    take: 20,
  });

  const total = records.length;
  const correct = records.filter(r => r.isCorrect).length;
  const recentAccuracy = total > 0 ? correct / total : 0;

  // 计算连续正确/错误数
  let consecutiveCorrect = 0;
  let consecutiveWrong = 0;
  for (const record of records) {
    if (record.isCorrect) {
      consecutiveCorrect++;
      consecutiveWrong = 0;
    } else {
      consecutiveWrong++;
      consecutiveCorrect = 0;
      break;
    }
  }

  return {
    total,
    correct,
    recentAccuracy,
    consecutiveCorrect,
    consecutiveWrong,
  };
}
```

- [ ] **Step 3: 实现 Examiner Agent**

```typescript
// lib/agents/examiner.ts
import { generateObject } from 'ai';
import { z } from 'zod';
import { getLLMProvider } from '../llm/factory';
import { adjustDifficulty, getDifficultyLabel } from '../adaptive/difficulty';
import { getStudentStats } from '../db/student';
import { getQuestionsByDifficulty } from '../db/question';

const QuestionSchema = z.object({
  type: z.enum(['choice', 'fill', 'code', 'design']),
  content: z.string().describe('题目内容'),
  options: z.array(z.string()).optional().describe('选择题选项'),
  answer: z.string().describe('参考答案'),
  explanation: z.string().describe('解析'),
  knowledgePoints: z.array(z.string()).describe('知识点标签'),
});

export async function generateQuestion(
  studentId: string,
  currentDifficulty: number,
  weakPoints: string[]
) {
  // 获取学员统计信息
  const stats = await getStudentStats(studentId);

  // 调整难度
  const newDifficulty = adjustDifficulty({
    currentDifficulty,
    recentAccuracy: stats.recentAccuracy,
    consecutiveCorrect: stats.consecutiveCorrect,
    consecutiveWrong: stats.consecutiveWrong,
  });

  const llm = getLLMProvider('examiner');

  const { object } = await generateObject({
    model: llm,
    schema: QuestionSchema,
    prompt: `生成一道操作系统练习题。

难度等级：${getDifficultyLabel(newDifficulty)} (${newDifficulty}/100)
重点考察知识点：${weakPoints.length > 0 ? weakPoints.join('、') : '综合'}
题目类型：随机选择（选择题、填空题、编程题、设计题）

要求：
1. 题目要清晰明确
2. 选项要有迷惑性（选择题）
3. 解析要详细，帮助学员理解
4. 涵盖 OpenCamp 训练营的内容（Rust、rCore、操作系统概念）`,
  });

  return {
    question: object,
    difficulty: newDifficulty,
    difficultyLabel: getDifficultyLabel(newDifficulty),
  };
}
```

- [ ] **Step 4: 提交**

```bash
git add lib/agents/examiner.ts lib/db/question.ts lib/adaptive/
git commit -m "feat: 实现 Examiner Agent 和自适应出题算法"
```

---

### Task 9: Planner Agent (规划)

**Files:**
- Create: `lib/agents/planner.ts`
- Create: `lib/db/progress.ts`

- [ ] **Step 1: 实现学习计划数据库操作**

```typescript
// lib/db/progress.ts
import { PrismaClient } from '@prisma/client';
import type { LearningPlan, Stage } from './schema';

const prisma = new PrismaClient();

export async function getOrCreatePlan(studentId: string, currentStage: Stage): Promise<LearningPlan> {
  let plan = await prisma.learningPlan.findUnique({
    where: { studentId },
  });

  if (!plan) {
    plan = await prisma.learningPlan.create({
      data: {
        studentId,
        currentStage,
        dailyTasks: [],
        weeklyGoals: [],
      },
    });
  }

  return plan;
}

export async function updatePlan(
  studentId: string,
  updates: Partial<Pick<LearningPlan, 'dailyTasks' | 'weeklyGoals' | 'estimatedCompletion'>>
) {
  return prisma.learningPlan.update({
    where: { studentId },
    data: {
      ...updates,
      lastAdjustedAt: new Date(),
    },
  });
}
```

- [ ] **Step 2: 实现 Planner Agent**

```typescript
// lib/agents/planner.ts
import { generateObject } from 'ai';
import { z } from 'zod';
import { getLLMProvider } from '../llm/factory';
import { getStudentProgress } from '../db/student';
import { getOrCreatePlan, updatePlan } from '../db/progress';
import type { Stage } from '../db/schema';

const LearningPlanSchema = z.object({
  currentStage: z.string(),
  dailyTasks: z.array(z.object({
    task: z.string(),
    type: z.enum(['study', 'practice', 'review']),
    estimatedMinutes: z.number(),
  })),
  weeklyGoals: z.array(z.string()),
  estimatedDays: z.number().describe('预计完成当前阶段的天数'),
  recommendations: z.array(z.string()).describe('学习建议'),
});

export async function generateLearningPlan(studentId: string) {
  const progress = await getStudentProgress(studentId);
  
  if (!progress) {
    throw new Error('Student not found');
  }

  const currentStage = progress.currentStage as Stage;
  const latestAssessment = progress.assessments[0];
  const weakPoints = latestAssessment?.weakPoints || [];

  const llm = getLLMProvider('planner');

  const { object } = await generateObject({
    model: llm,
    schema: LearningPlanSchema,
    prompt: `为学员生成个性化学习计划。

当前阶段：${currentStage}
理论水平：${latestAssessment?.theory || '未评估'}/100
编码能力：${latestAssessment?.coding || '未评估'}/100
Rust 水平：${latestAssessment?.rust || '未评估'}/100
薄弱知识点：${weakPoints.join('、') || '无'}

OpenCamp 训练营阶段：
- pre_study_theory: 导学-理论（自学）
- pre_study_rust: 导学-Rust（自学）
- pre_study_tools: 导学-工具（自学）
- basic: 基础阶段（3周）
- professional: 专业阶段（3周）
- project_intro: 项目先导（4周）
- project: 项目阶段（6周）

请生成每日任务和每周目标，考虑学员的薄弱环节。`,
  });

  // 保存学习计划
  await updatePlan(studentId, {
    dailyTasks: object.dailyTasks,
    weeklyGoals: object.weeklyGoals,
    estimatedCompletion: new Date(Date.now() + object.estimatedDays * 24 * 60 * 60 * 1000),
  });

  return object;
}
```

- [ ] **Step 3: 提交**

```bash
git add lib/agents/planner.ts lib/db/progress.ts
git commit -m "feat: 实现 Planner Agent 和学习计划生成"
```

---

## 阶段 3: 知识库与题库 (第 5-6 周)

### Task 10: 知识库向量化

**Files:**
- Create: `lib/knowledge/index.ts`
- Create: `lib/knowledge/embeddings.ts`

- [ ] **Step 1: 实现文本向量化**

```typescript
// lib/knowledge/embeddings.ts
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: text,
  });
  return embedding;
}

export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(
    texts.map(text => generateEmbedding(text))
  );
  return embeddings;
}
```

- [ ] **Step 2: 实现知识库索引**

```typescript
// lib/knowledge/index.ts
import { PrismaClient } from '@prisma/client';
import { generateEmbedding } from './embeddings';

const prisma = new PrismaClient();

// 注意：需要在 Supabase 中启用 pgvector 扩展
// CREATE EXTENSION IF NOT EXISTS vector;

export async function indexKnowledge(
  content: string,
  source: string,
  topic: string
) {
  const embedding = await generateEmbedding(content);
  
  // 使用 Supabase 的 pgvector 存储
  // 实际实现需要使用 Supabase 客户端
  // const { data, error } = await supabase
  //   .from('knowledge')
  //   .insert({
  //     content,
  //     source,
  //     topic,
  //     embedding,
  //   });

  console.log(`Indexed: ${source} (${topic})`);
}

export async function searchKnowledge(
  query: string,
  topic?: string,
  limit: number = 5
) {
  const embedding = await generateEmbedding(query);
  
  // 使用 pgvector 进行相似度搜索
  // const { data } = await supabase.rpc('match_knowledge', {
  //   query_embedding: embedding,
  //   match_threshold: 0.8,
  //   match_count: limit,
  //   filter_topic: topic,
  // });

  // 返回模拟数据
  return [
    {
      content: `关于 "${query}" 的知识...`,
      source: 'rCore-Tutorial',
      relevance: 0.95,
    },
  ];
}
```

- [ ] **Step 3: 创建知识库导入脚本**

```typescript
// scripts/import-knowledge.ts
import { indexKnowledge } from '../lib/knowledge/index';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

async function importKnowledgeDocs() {
  const docsPath = './data/knowledge';
  const files = await readdir(docsPath);
  
  for (const file of files) {
    if (file.endsWith('.md')) {
      const content = await readFile(join(docsPath, file), 'utf-8');
      const topic = file.replace('.md', '');
      
      // 按段落分割
      const paragraphs = content.split('\n\n').filter(p => p.trim());
      
      for (const paragraph of paragraphs) {
        if (paragraph.length > 50) { // 过滤太短的段落
          await indexKnowledge(paragraph, file, topic);
        }
      }
    }
  }
  
  console.log('Knowledge import complete');
}

importKnowledgeDocs().catch(console.error);
```

- [ ] **Step 4: 提交**

```bash
git add lib/knowledge/ scripts/
git commit -m "feat: 实现知识库向量化和索引"
```

---

### Task 11: 初始题库构建

**Files:**
- Create: `data/questions/os-basics.json`
- Create: `scripts/import-questions.ts`

- [ ] **Step 1: 创建初始题库**

```json
// data/questions/os-basics.json
[
  {
    "type": "choice",
    "difficulty": 30,
    "knowledgePoints": ["process", "scheduling"],
    "content": "在进程调度中，RR（Round Robin）算法的主要优点是什么？",
    "options": [
      "A. 响应时间短",
      "B. 吞吐量高",
      "C. 实现简单",
      "D. 适合批处理系统"
    ],
    "answer": "A",
    "explanation": "RR 算法通过时间片轮转，保证每个进程都能在一定时间内得到 CPU，因此响应时间短。缺点是上下文切换开销大。"
  },
  {
    "type": "choice",
    "difficulty": 40,
    "knowledgePoints": ["memory", "virtual_memory"],
    "content": "页表的主要作用是什么？",
    "options": [
      "A. 存储进程的所有数据",
      "B. 将虚拟地址映射到物理地址",
      "C. 管理磁盘空间",
      "D. 实现进程间通信"
    ],
    "answer": "B",
    "explanation": "页表是操作系统内存管理的核心数据结构，负责将进程使用的虚拟地址转换为实际的物理地址。"
  },
  {
    "type": "fill",
    "difficulty": 50,
    "knowledgePoints": ["process", "state"],
    "content": "进程的三种基本状态是：______、______、______。",
    "answer": "就绪、运行、阻塞",
    "explanation": "进程状态转换图：就绪态等待 CPU，运行态占用 CPU，阻塞态等待 I/O 或事件。"
  }
]
```

- [ ] **Step 2: 实现题库导入脚本**

```typescript
// scripts/import-questions.ts
import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';

const prisma = new PrismaClient();

interface QuestionData {
  type: string;
  difficulty: number;
  knowledgePoints: string[];
  content: string;
  options?: string[];
  answer: string;
  explanation: string;
}

async function importQuestions() {
  const data = await readFile('./data/questions/os-basics.json', 'utf-8');
  const questions: QuestionData[] = JSON.parse(data);

  for (const q of questions) {
    await prisma.question.create({
      data: {
        type: q.type,
        difficulty: q.difficulty,
        knowledgePoints: q.knowledgePoints,
        content: q.content + (q.options ? '\n' + q.options.join('\n') : ''),
        answer: q.answer,
        explanation: q.explanation,
      },
    });
  }

  console.log(`Imported ${questions.length} questions`);
}

importQuestions().catch(console.error);
```

- [ ] **Step 3: 运行导入**

```bash
npx tsx scripts/import-questions.ts
```

- [ ] **Step 4: 提交**

```bash
git add data/questions/ scripts/import-questions.ts
git commit -m "feat: 添加初始题库和导入脚本"
```

---

## 阶段 4: UI 完善 (第 7-8 周)

### Task 12: 出题界面

**Files:**
- Create: `app/components/ExamPanel.tsx`
- Create: `app/api/exam/route.ts`

- [ ] **Step 1: 创建出题 API**

```typescript
// app/api/exam/route.ts
import { NextResponse } from 'next/server';
import { generateQuestion } from '@/lib/agents/examiner';
import { saveAnswerRecord } from '@/lib/db/question';

export async function POST(req: Request) {
  const { studentId, action, questionId, answer, timeSpent } = await req.json();

  if (action === 'generate') {
    // 生成新题目
    const result = await generateQuestion(studentId, 50, []); // TODO: 从学员档案获取难度和薄弱点
    return NextResponse.json(result);
  }

  if (action === 'submit') {
    // 提交答案
    // TODO: 验证答案是否正确
    const isCorrect = false; // 需要实际验证逻辑
    await saveAnswerRecord(studentId, questionId, answer, isCorrect, timeSpent);
    return NextResponse.json({ isCorrect });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
```

- [ ] **Step 2: 实现出题界面组件**

```tsx
// app/components/ExamPanel.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface Question {
  type: string;
  content: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export function ExamPanel({ studentId }: { studentId: string }) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [difficulty, setDifficulty] = useState(50);
  const [stats, setStats] = useState({ total: 0, correct: 0 });

  const generateNewQuestion = async () => {
    const res = await fetch('/api/exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, action: 'generate' }),
    });
    const data = await res.json();
    setQuestion(data.question);
    setDifficulty(data.difficulty);
    setSelectedAnswer('');
    setShowResult(false);
  };

  const submitAnswer = async () => {
    if (!question) return;
    
    // 简单的客户端验证（实际应该在服务端）
    const correct = selectedAnswer === question.answer;
    setIsCorrect(correct);
    setShowResult(true);
    setStats(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (correct ? 1 : 0),
    }));

    // 保存答题记录
    await fetch('/api/exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        action: 'submit',
        questionId: 'temp', // TODO: 使用实际题目 ID
        answer: selectedAnswer,
        timeSpent: 0,
      }),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">练习模式</h2>
        <div className="text-sm text-muted-foreground">
          难度: {difficulty} | 正确率: {stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0}%
        </div>
      </div>

      {question ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{question.content}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {question.type === 'choice' && question.options && (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                {question.options.map((opt, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.charAt(0)} id={`opt-${i}`} />
                    <Label htmlFor={`opt-${i}`}>{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {showResult && (
              <div className={`p-3 rounded ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                <p className="font-medium">{isCorrect ? '✓ 正确' : '✗ 错误'}</p>
                <p className="text-sm mt-1">{question.explanation}</p>
              </div>
            )}

            <div className="flex gap-2">
              {!showResult ? (
                <Button onClick={submitAnswer} disabled={!selectedAnswer}>
                  提交答案
                </Button>
              ) : (
                <Button onClick={generateNewQuestion}>
                  下一题
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">点击开始练习</p>
            <Button onClick={generateNewQuestion}>开始练习</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add app/components/ExamPanel.tsx app/api/exam/
git commit -m "feat: 实现出题界面和 API"
```

---

### Task 13: 进度面板

**Files:**
- Create: `app/components/ProgressPanel.tsx`

- [ ] **Step 1: 实现进度面板组件**

```tsx
// app/components/ProgressPanel.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProgressData {
  stage: string;
  stageLabel: string;
  completedTasks: number;
  totalTasks: number;
  accuracy: number;
}

export function ProgressPanel({ data }: { data: ProgressData }) {
  const progressPercent = data.totalTasks > 0 
    ? Math.round(data.completedTasks / data.totalTasks * 100) 
    : 0;

  const stages = [
    { key: 'pre_study_theory', label: '导学-理论' },
    { key: 'pre_study_rust', label: '导学-Rust' },
    { key: 'pre_study_tools', label: '导学-工具' },
    { key: 'basic', label: '基础阶段' },
    { key: 'professional', label: '专业阶段' },
    { key: 'project_intro', label: '项目先导' },
    { key: 'project', label: '项目阶段' },
  ];

  const currentStageIndex = stages.findIndex(s => s.key === data.stage);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">学习进度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>当前阶段: {data.stageLabel}</span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} />
            </div>

            <div className="text-sm text-muted-foreground">
              完成任务: {data.completedTasks}/{data.totalTasks}
            </div>
            <div className="text-sm text-muted-foreground">
              答题正确率: {data.accuracy}%
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">阶段总览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <div
                key={stage.key}
                className={`flex items-center gap-2 p-2 rounded text-sm ${
                  index === currentStageIndex
                    ? 'bg-primary/10 font-medium'
                    : index < currentStageIndex
                    ? 'text-muted-foreground'
                    : ''
                }`}
              >
                <span>
                  {index < currentStageIndex ? '✓' : index === currentStageIndex ? '►' : '○'}
                </span>
                <span>{stage.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add app/components/ProgressPanel.tsx
git commit -m "feat: 实现进度面板组件"
```

---

## 阶段 5: 测试与优化 (第 9-10 周)

### Task 14: 端到端测试

**Files:**
- Create: `tests/agents/router.test.ts`
- Create: `tests/adaptive/difficulty.test.ts`

- [ ] **Step 1: 编写 Router Agent 测试**

```typescript
// tests/agents/router.test.ts
import { describe, it, expect } from 'vitest';
import { routeUserMessage } from '@/lib/agents/router';

describe('Router Agent', () => {
  it('应该识别出题意图', async () => {
    const decision = await routeUserMessage('给我出几道练习题');
    expect(decision.intent).toBe('examiner');
    expect(decision.confidence).toBeGreaterThan(0.7);
  });

  it('应该识别答疑意图', async () => {
    const decision = await routeUserMessage('什么是页表？');
    expect(decision.intent).toBe('tutor');
    expect(decision.confidence).toBeGreaterThan(0.7);
  });

  it('应该识别评估意图', async () => {
    const decision = await routeUserMessage('评估一下我的水平');
    expect(decision.intent).toBe('assessor');
  });

  it('应该识别规划意图', async () => {
    const decision = await routeUserMessage('帮我制定学习计划');
    expect(decision.intent).toBe('planner');
  });
});
```

- [ ] **Step 2: 编写难度调整测试**

```typescript
// tests/adaptive/difficulty.test.ts
import { describe, it, expect } from 'vitest';
import { adjustDifficulty } from '@/lib/adaptive/difficulty';

describe('Difficulty Adjustment', () => {
  it('连续正确应该提升难度', () => {
    const result = adjustDifficulty({
      currentDifficulty: 50,
      recentAccuracy: 0.9,
      consecutiveCorrect: 4,
      consecutiveWrong: 0,
    });
    expect(result).toBeGreaterThan(50);
  });

  it('连续错误应该降低难度', () => {
    const result = adjustDifficulty({
      currentDifficulty: 50,
      recentAccuracy: 0.3,
      consecutiveCorrect: 0,
      consecutiveWrong: 3,
    });
    expect(result).toBeLessThan(50);
  });

  it('难度应该在 0-100 范围内', () => {
    const result = adjustDifficulty({
      currentDifficulty: 95,
      recentAccuracy: 0.95,
      consecutiveCorrect: 5,
      consecutiveWrong: 0,
    });
    expect(result).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
npm install -D vitest @vitejs/plugin-react
npx vitest run
```

- [ ] **Step 4: 提交**

```bash
git add tests/
git commit -m "test: 添加 Router Agent 和难度调整测试"
```

---

### Task 15: 部署配置

**Files:**
- Create: `vercel.json`
- Create: `README.md`

- [ ] **Step 1: 创建 Vercel 配置**

```json
// vercel.json
{
  "buildCommand": "prisma generate && next build",
  "env": {
    "DATABASE_URL": "@database-url",
    "SUPABASE_URL": "@supabase-url",
    "SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

- [ ] **Step 2: 创建 README**

```markdown
# OpenCamp AI 助教

基于多 Agent 架构的 OS 训练营 AI 助教系统。

## 功能特性

- 🤖 多 Agent 架构：Router、Tutor、Assessor、Examiner、Planner
- 📊 自适应出题：根据学员水平动态调整难度
- 📚 知识库检索：OS 教材和代码库
- 📈 进度跟踪：学习计划和完成度
- 🔧 灵活 LLM：支持 OpenAI、Anthropic、本地模型

## 快速开始

1. 克隆项目
```bash
git clone <repo-url>
cd "Dream Agent"
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env.local
# 编辑 .env.local，填入数据库和 API 配置
```

4. 初始化数据库
```bash
npx prisma migrate dev
npx tsx scripts/import-questions.ts
```

5. 启动开发服务器
```bash
npm run dev
```

## 技术栈

- Next.js 14 (App Router)
- Vercel AI SDK
- Supabase (pgvector + PostgreSQL)
- shadcn/ui + Tailwind CSS

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

## 许可证

MIT
```

- [ ] **Step 3: 提交**

```bash
git add vercel.json README.md
git commit -m "docs: 添加部署配置和 README"
```

---

## 最终验证

- [ ] **验证所有功能**
  - 聊天功能正常
  - 出题功能正常
  - 进度显示正常
  - LLM 配置生效

- [ ] **性能测试**
  - 响应时间 < 5 秒
  - 并发支持 10 用户

- [ ] **部署到 Vercel**
  ```bash
  vercel --prod
  ```

---

*计划完成*
