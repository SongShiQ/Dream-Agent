# 参考仓库可复用性评估（源码下载受阻版）

> **历史文档，请勿继续作为选型依据**：2026-07-17 已完成四仓库源码审计，详见 [2026-07-17-four-repos-source-audit.md](./2026-07-17-four-repos-source-audit.md)。其中 `nashsu/llm_wiki` 的旧判断已被证实不准确：它是完整 Tauri 桌面应用，不是轻量脚本。

**日期**：2026-07-16  
**状态**：本机/沙箱当前无法连接 github.com（curl error 7），源码未能落盘。  
**结论口径**：基于公开 README/架构与 Dream Agent 现有代码对照；待 `refs/` 下载完成后做代码级复核。

## 0. 先说人话

| 问题 | 答案 |
|---|---|
| 有没有能“整仓直接当我们系统用”的？ | **没有** |
| 有没有能“直接抄模块少踩坑”的？ | **有，但是分层抄** |
| 现在最该直接用谁的代码？ | **优先用 Dream Agent 自己的**；外部以 Wiki 协议/OpenKB 流程/DeepTutor 状态机为参考实现 |

## 1. 分仓库可复用性

### DeepTutor（HKUDS/DeepTutor）

**技术栈**：Python + FastAPI + React（与我们 Next/TS 异构）

| 模块类型 | 直接可用？ | 建议 |
|---|---|---|
| 整仓当后端 | ❌ | 栈不同，集成成本 > 自研增强 |
| 多 Agent 编排思路 | ✅ 思想可用 | 对照我们 Router/Tutor/Examiner… |
| Mastery / Memory 设计 | ✅ 思想可用 | 映射到 `lib/memory/*` + `lib/progress/mastery.ts` |
| 前端 React 组件 | ⚠️ 难直接用 | 设计可参考，代码难贴进 App Router |
| RAG/Graph 管道 | ❌ 暂不 | 过重，本地优先不做 |

**判决**：不当依赖库；当**教学状态机参考实现**。我们已有 80% 骨架。

### OpenKB（VectifyAI/OpenKB）

**技术栈**：Python CLI 知识引擎

| 模块类型 | 直接可用？ | 建议 |
|---|---|---|
| 作为 sidecar CLI | ⚠️ 条件可用 | 本机 Python 环境齐时可 `ingest/ask/lint` 离线跑，产物导入 `data/knowledge` |
| 嵌进 Next 同进程 | ❌ | 语言边界硬 |
| 页面 schema / lint 规则 | ✅ 可移植 | 用 TS 重写轻量版最划算 |
| 向量后端全家桶 | ❌ 暂不 | 先文件+标签检索 |

**判决**：最有“拿来主义”潜力的是 **CLI 旁路编译知识**，不是替换我们后端。

### llm-wiki-skills（ishicm/llm-wiki-skills）

**形态**：Agent Skill 文档/规程，不是运行时库

| 模块类型 | 直接可用？ | 建议 |
|---|---|---|
| SKILL 文本/目录约定 | ✅ 几乎直接用 | 可拷进 `.agents/skills` 或 `docs/wiki-ops` |
| 代码依赖 | 无 | 改写成我们的 ingest/query 约定即可 |

**判决**：**最容易直接用**的一包——当工作流说明书，不是当 npm 包。

### llm_wiki（nashsu/llm_wiki）

**形态**：轻量 LLM Wiki 实践脚本

| 模块类型 | 直接可用？ | 建议 |
|---|---|---|
| Markdown wiki 目录实践 | ✅ 可参考/部分拷贝 | 对齐 `data/knowledge` |
| 查询脚本 | ⚠️ | 可参考 prompt，不必整仓接入 |
| 当生产引擎 | ❌ | 能力弱于 OpenKB，也弱于我们自控内容包 |

**判决**：当**最小 Wiki 样板**，防我们自己设计目录时踩空。

## 2. 反而最该“直接用”的：Dream Agent 现有代码

这些已经在仓里，比外部仓库更该当底座：

| 已有模块 | 路径 | 用途 |
|---|---|---|
| 多 Agent | `lib/agents/*` | 对标 DeepTutor 教学运行时 |
| 分层记忆 | `lib/memory/l1-l3*` | 对标 DeepTutor memory |
| 知识卡检索 | `lib/knowledge/cards.ts` | Wiki Query 的雏形 |
| 诊断/路径/计划 | `lib/assess` `lib/learning` `lib/plan` | 导学闭环 |
| 掌握度/每日进度 | `lib/progress/*` | mastery 证据 |
| Lab 关卡 | `lib/labs/*` | 练习骨架 |
| 本地 judge | `lib/judge/*` | 本地验证，不必在线 OJ |
| 题库/课程包 | `data/questions` `data/curriculum` | 内容资产 |
| 反馈三模式 | `lib/feedback/*` | 教学提示 |

**策略**：外部代码能嵌再嵌；不能嵌就**对照实现，不重开炉灶**。

## 3. “能用就用”的推荐接入顺序（避坑）

1. **先用 Dream Agent 全套**当主系统（已跑通的壳）  
2. **直接采用 llm-wiki-skills 的操作规程**（文档级，零栈冲突）  
3. **Wiki 目录约定参考 llm_wiki / OpenKB 产物形态**，落在 `data/knowledge`  
4. **OpenKB 仅作可选 sidecar**（有 Python 时离线 ingest，没有就手写/半自动）  
5. **DeepTutor 只对照状态机与 mastery，不引入 Python 服务**  
6. 本地 judge 继续用我们自己的 `lib/judge`，别接在线 OJ

## 4. 下载受阻时你怎么做

脚本：`docs/scripts/download-refs.ps1`  
目标目录：`D:\THU\BeiJing\训练营\refs\`

下载完成后告诉我，我立刻做：
- 目录级可复用清单（精确到文件）
- 哪些函数/类值得 port 到 TS
- 许可证是否允许拷贝

## 5. 一句话结论

> **没有“下载就能当我们教学 Agent 用”的整仓银弹；有的是：Dream Agent 主底座 + skills 规程直接用 + OpenKB/Wiki 当知识编译旁路参考 + DeepTutor 当教学状态机参考。这样最不容易踩坑。**
