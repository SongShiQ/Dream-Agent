# 四个开源项目调研：5 分钟汇报提纲

**关联完整版**：[2026-07-17-four-repos-source-audit.md](./2026-07-17-four-repos-source-audit.md)

## 1. 开场结论（30 秒）

这四个项目并不是四个互相替代的 AI 助教，而是位于不同层级：

- DeepTutor 解决“怎么教、怎么测、怎么记住学生”；
- llm-wiki-skills 解决“Agent 按什么规矩整理知识”；
- OpenKB 解决“怎样把原始资料编译成可维护 Wiki”；
- nashsu/llm_wiki 解决“怎样把这套 Wiki 做成教师可使用的桌面产品”。

它们都不解决 OS 课程最关键的真实验执行和可信判分，所以 OS 实验生成框架与 Judge 不能被替换。

## 2. 四个项目各讲一句（1 分钟）

**DeepTutor** 是一个完整 AI 导师运行时，已经有 chat、解题、研究、可视化、知识库、记忆和 mastery path。最值得借鉴的是“LLM 决定怎么教，确定性 Gate 决定能不能前进”。

**llm-wiki-skills** 不是软件，而是一份 278 行的 Agent 操作规程，规定怎么创建、摄入、重组和检查 Markdown Wiki。可以直接采用规则，但没有解析器、API、锁或测试。

**OpenKB** 是 Python CLI 知识编译器。它能读 PDF/Word/PPT/URL，长 PDF 用 PageIndex 树索引，生成 summary、concept、entity、引用、索引和日志，还能 query、chat、lint、生成 Skill。适合教师侧离线生产课程知识。

**nashsu/llm_wiki** 是完整 Tauri 桌面应用，不是此前以为的轻量脚本。它已有文档摄入、图谱、向量搜索、审核、Deep Research、浏览器剪藏、本地 HTTP API 和 MCP，最适合直接下载做教师端演示。

## 3. 哪些能直接用（1 分钟）

可以直接用，但要放对位置：

1. LLM Wiki Windows portable：直接演示 OS 资料 -> Wiki -> 图谱 -> 问答。
2. OpenKB wheel：直接做教师/CI 侧离线知识生产，不放学生在线请求热路径。
3. DeepTutor：直接独立部署体验 Tutor 和 mastery，不整仓塞进现有 Dream Agent。
4. llm-wiki-skills：直接吸收操作规程，不把它当知识引擎。

不存在“下载一个仓库就得到 OpenCamp OS 自学系统”的银弹。

## 4. 推荐组合（1 分钟）

```text
教师资料
  -> OpenKB 离线编译
  -> Git diff + lint + 教师审核
  -> Dream Agent 课程知识包
  -> Tutor / Quiz / Plan
  -> 独立 Docker/QEMU Judge
  -> AC/失败证据
  -> Mastery / 薄弱点 / 下一任务
```

Dream Agent 保持唯一学生入口和证据库；DeepTutor 的 mastery/policy/scheduler 思路移植到 TypeScript；OpenKB 做 sidecar；桌面 LLM Wiki 是可选教师工具；实验判定继续由独立 Judge 完成。

## 5. 一周演示方案（45 秒）

选“虚拟内存/地址转换”一个主题：

1. 导入教材章节、rCore 文档、实验说明和典型错误；
2. 用 OpenKB 或桌面 LLM Wiki 生成并人工检查 Wiki；
3. DeepTutor 直接连接这个 Markdown/Obsidian 目录，演示讲解和 mastery path；
4. 学生实验仍提交 Dream Agent，由真实 Judge 返回 AC；
5. 手工展示 AC 如何影响下一学习任务。

这能快速证明三层合体体验，但不冒充已经完成多用户生产集成。

## 6. 需要老师拍板（45 秒）

建议确认四个决策：

1. 首个纵向样板是否定为“虚拟内存/地址转换”；
2. 公共课程知识必须经过教师审核后发布；
3. OpenKB 固定版本作为离线内容工具，不做学生在线服务；
4. 任何 LLM 输出都不能直接写入 AC 或课程 Gate passed。

## 7. 被问到“为什么不全拿来用”时

回答：全拿会得到两套 Tutor UI、两套知识引擎、三套会话/配置和一套仍然缺失的 OS Judge。正确的拿来主义是复用每个项目最成熟的那一层，而不是把四个完整产品绑在一起。

## 8. 被问到“最大的坑是什么”时

- 四个项目都很新，版本和数据格式变化快；
- LLM 编译 Wiki 会产生幻觉，必须保留来源和审核；
- DeepTutor 的本地代码执行不是多租户 OJ；
- OpenKB 是 Alpha CLI，不是现成知识服务；
- nashsu/llm_wiki 是 GPL-3.0，源码合并要评估许可；
- 当前 nashsu 根锁文件不同步，`npm ci` 已实测失败。

## 9. 收尾句

> Wiki 管知识质量，Tutor 管教学路径，Judge 管真实能力，教师管发布权限。把这四个责任接成闭环，才是 OS 自学系统；单独做任何一个，都只是局部工具。
