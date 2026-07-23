# Dream Agent：面向 OS 课程的 AI 自学系统

Dream Agent 不是一个只负责聊天的 AI 助教，而是一套面向操作系统课程的学习闭环：用经过审核的课程知识支持导学，用确定性小测记录基础阶段掌握度，并为后续可信实验判分保留清晰边界。

> 当前重点：导学阶段与基础阶段。真实 OS/QEMU 实验暂缓，不用尚未完成的实验能力包装项目进度。

## 当前状态

截至 2026-07-23，项目已经完成可运行的导学与基础学习主线，并建立内容治理和质量门禁。

| 项目 | 当前结果 |
|---|---|
| 学生入口 | Dashboard、课程单元、知识卡、基础小测、薄弱点与下一任务 |
| 基础主题 | OS 总览与中断、进程与调度已完成纵向验收；内存与虚存已进入结构化主题包 |
| 教师运营 | `/ops` 展示知识、题库覆盖、内容审核和发布检查 |
| 内容治理 | OpenKB manifest 导入、来源引用、审核决策、development/release 双模式门禁 |
| 学习证据 | 阅读知识卡不授予 mastery；基础掌握度只接受服务端 high-stakes quiz |
| 自动化验证 | 44 个测试文件、181 项测试通过；TypeScript 检查和生产构建通过 |
| 发布状态 | 工程验证通过；正式内容发布仍被待教师审核项有意阻断 |

## 为什么研究四个开源项目

四个项目解决的不是同一个问题。Dream Agent 采用分层借鉴，不进行整仓拼接。

| 参考项目 | 原项目擅长什么 | Dream Agent 如何吸收 |
|---|---|---|
| [HKUDS/DeepTutor](https://github.com/HKUDS/DeepTutor) | 对话、深度解题、研究、可视化、记忆和 mastery path | 借鉴教学策略、学习路径和“下一目标”机制，Dream Agent 仍是唯一学生入口和证据库 |
| [ishicm/llm-wiki-skills](https://github.com/ishicm/llm-wiki-skills) | Agent 维护 Markdown Wiki 的操作规程 | 吸收知识卡、稳定 ID、来源引用、索引同步、查重和过期检查规则 |
| [VectifyAI/OpenKB](https://github.com/VectifyAI/OpenKB) | 将 PDF、PPT、网页等资料离线编译成结构化知识 | 作为教师侧“公共藏书阁”的离线知识生产工具，内容审核后才进入课程知识库 |
| [nashsu/llm_wiki](https://github.com/nashsu/llm_wiki) | 本地个人知识管理、剪藏、图谱、搜索和研究 | 定位为学生可选的“私人书房”，通过导出/API/MCP 松耦合，不复制 GPL-3.0 源码 |

最终形成“双层知识空间”：

```text
教师公共藏书阁
OpenKB -> 来源检查 -> 教师审核 -> Dream Agent 公共课程知识

学生私人书房
nashsu/llm_wiki -> 个人笔记、剪藏和复习材料 -> 默认私有

在线导师
Dream Agent <- DeepTutor 的教学机制

编目与维护规程
llm-wiki-skills -> 稳定 ID、引用、索引、查重和质量检查
```

学生可以将私人笔记投稿到公共知识空间，但必须经过来源检查和教师审核。私人笔记、聊天回答和知识卡阅读都不能直接成为课程掌握度证据。

## 已实现的学习闭环

```text
课程单元
  -> 主题学习地图
  -> 知识卡与来源
  -> 服务端基础小测
  -> 错因和薄弱知识点
  -> 补弱卡与复习调度
  -> 下一学习任务
```

核心原则：

- LLM 决定如何解释，确定性 Gate 决定学生能否前进。
- 公共课程内容必须带来源，并经过质量检查和教师审核。
- 学生端不接受客户端伪造的分数、mastery 或实验 AC。
- Git 内容文件是课程知识权威源，OpenKB 不进入学生在线请求热路径。
- 后续实验只有受保护 Judge 返回的 `AC` 才能通过 Lab Gate。

## 演示入口

启动项目后访问：

- `http://localhost:3000`：学生学习入口。
- `http://localhost:3000/ops`：教师内容运营与发布检查。

推荐演示顺序：

1. 从学生首页进入“OS 总览与中断”或“进程与调度”。
2. 查看学习目标、典型误区、知识卡和来源。
3. 启动基础小测，观察失败后的知识点诊断与补弱建议。
4. 刷新页面，确认学习状态和复习任务仍然保留。
5. 打开 `/ops`，查看题库覆盖、知识审核和发布阻断原因。

## 本地运行

### 环境要求

- Node.js 20 或更高版本
- npm
- 本地 SQLite（由 Prisma 自动创建，无需单独安装数据库服务）

### 安装与启动

```bash
git clone https://github.com/SongShiQ/Dream-Agent.git
cd Dream-Agent
npm ci
```

如需调用在线 LLM，复制环境变量模板并填写对应密钥；基础学习与内容检查不依赖 LLM 密钥。

```powershell
Copy-Item .env.example .env.local
```

初始化数据库和课程题目：

```bash
npx prisma generate
npx prisma migrate dev
npm run content:import
```

启动开发服务：

```bash
npm run dev
```

## 质量验证

```bash
npm run typecheck
npm test -- --run
npm run build
```

内容治理相关命令：

```bash
npm run content:audit
npm run content:release-check -- --mode development
npm run content:release-check -- --mode release
```

`development` 模式允许待审核内容以 warning 存在；`release` 模式会阻断缺来源、未审核、过期或结构错误的内容。系统不会自动替教师批准内容。

## 目录结构

```text
app/                  Next.js 页面和服务端 API
components/           学生端与教师端交互组件
data/
  curriculum/         课程结构和基础主题包
  knowledge/          带来源的课程知识与知识卡
  questions/          诊断和基础阶段题库
  experiments/        后续实验模板，不代表真实 Judge 已完成
lib/
  foundation/         基础单元、题库覆盖和主题包检查
  knowledge/          知识卡、引用、审核和 OpenKB 导入
  content/            内容决策与发布门禁
  progress/           mastery 策略和复习调度
  experiments/        形成性实验领域模型
prisma/               数据模型和数据库迁移
scripts/              内容导入、审计和维护脚本
tests/                API、策略、内容和流程测试
docs/                 调研、计划、汇报、架构决策和工作日志
```

详细文档入口见 [docs/README.md](docs/README.md)。最新教师汇报材料见 [AgentOS 导学与基础阶段进展汇报作战手册](docs/reports/宋红-AgentOS导学与基础阶段进展汇报作战手册-2026-07-21.md)。

## 当前边界与下一步

近期继续专精前两个阶段：

1. 完成“内存与虚存”主题包的内容质量和浏览器验收。
2. 将题目质量检查完整接入教师运营页和内容发布门禁。
3. 用真实学生流程验证导学、失败诊断、补弱和复习闭环。
4. 由教师决定哪些待审核知识可以进入正式 release。

当前不承诺：多租户生产部署、完整教务系统、真实 QEMU Judge、自动批准 AI 生成内容，以及将四个参考项目源码直接合并进本仓库。

## 许可与引用

Dream Agent 当前以 MIT 许可发布。四个参考项目保持各自许可，本仓库只实现独立适配和思想借鉴；尤其不复制 `nashsu/llm_wiki` 的 GPL-3.0 源码。
