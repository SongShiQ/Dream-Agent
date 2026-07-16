# 工作日志 · 效果优先结论与工作区清理

**日期**：2026-07-16  
**仓库**：Dream Agent (`SongShiQ/Dream-Agent`)  
**任务**：
1. 不论工程难度，判断 DeepTutor / LLM Wiki / OpenKB / OS 实验 哪条路线最终学习效果更好；
2. 清理可再生运行时垃圾，并把结论落盘。

## 效果结论（核心）

**最终效果最好的是三层合体，不是单押某一个开源项目：**

```text
课程 Wiki（可编译 / 可引用 / 可维护）
  + DeepTutor 式教学运行时（诊断 / 路径 / 记忆 / 掌握度）
  + 真实 OS 实验与 OJ 证据（AC 纪律）
```

### 效果排名（忽略实现成本）

1. **Wiki + Tutor 闭环 + 真实验 OJ** — 上限最高，最适配 OpenCamp  
2. Tutor 闭环 + 真实验 OJ（知识层较薄） — 学生日常体感仍强  
3. Wiki + 真实验 OJ（教学编排弱） — 利好强自驱与教研资产  
4. 仅 DeepTutor 式陪伴  
5. 仅 LLM Wiki / OpenKB  
6. 仅聊天式 RAG — 效果最差

### 分维直觉

- 学生每天是否愿意学、知不知道下一步：**Tutor 闭环**贡献最大  
- 三年后课程是否越来越强、口径是否稳定：**Wiki 治理**贡献最大  
- 晋级能否信、会不会做：**真 OJ / 实验证据**贡献最大  
- OpenCamp 倒金字塔若缺任一维，都会在完课、深度或可信分流上塌方

### 对现有框架的含义

- Dream Agent 已有的学习闭环、题库、关卡/OJ 纪律，是高价值效果资产，应保留为壳。  
- 最大效果短板是知识层仍偏卡片检索，尚未形成可编译、可 lint、可回写的课程 Wiki。  
- DeepTutor 应主要吸收机制（统一学生状态、掌握度、记忆），不必以整仓替换换取效果。  
- OpenKB / llm-wiki-skills / llm_wiki 贡献的是知识生产与维护效果，不是学生首页本身。

## 今日文档产出

| 文件 | 用途 |
|---|---|
| `docs/research/2026-07-16-effect-priority-conclusion.md` | **效果优先**正式结论（主文档） |
| `docs/research/2026-07-16-deeptutor-llm-wiki-openkb-os-lab-research.md` | 既有架构预研（保留，被效果结论引用） |
| `docs/日志/2026-07-16-deeptutor-llm-wiki-openkb-os-lab-research.md` | 早前受限调研日志（已被本日志覆盖更新） |
| `docs/日志/2026-07-16-effect-priority-and-workspace-cleanup.md` | 本日志 |

## 工作区清理动作

### 已做 / 应做的“优雅清理”

1. **运行时垃圾**：删除可再生文件  
   - `server.log`  
   - `server.err.log`  
   - `server.log.bak`（约 5MB）  
   - `tsconfig.tsbuildinfo`（若存在）  
   上述多已在 `.gitignore` 中，不影响功能。
2. **调研产物归位**：效果结论进入 `docs/research/`，过程与决策进入 `docs/日志/`，避免聊天结论漂移。  
3. **不在此步强行改写 M1–M5 代码语义**：当前 `main` 上大量 funnel-OJ / foundation / judge 未提交改动视为**进行中资产**，清理原则是“不丢工作、不搅主线”，而不是假装它们不存在。

### 工作区仍不干净的部分（如实记录）

截至本日志，`git status` 仍包含大量已修改与未跟踪文件，主线是 2026-07-14 起的倒金字塔 / OJ Phase A–B / M0–M5 工作，外加今日调研文档。  
**这不是事故，是未快照的在研工作面。**

建议的后续优雅收敛（需你确认后执行 commit）：

```text
# 方案 A（推荐）：WIP 分支快照，使工作树可恢复地变干净
git checkout -b wip/2026-07-16-funnel-oj-and-research
git add -A
git commit -m "wip: funnel-oj M1-M5 snapshot + 2026-07-16 research conclusions"

# 方案 B：实验分支只带研究文档，代码 WIP 另 stash
git stash push -u -m "wip: funnel-oj m1-m5"
git checkout -b docs/2026-07-16-effect-priority
```

今日**未擅自 commit**，避免把未审的 M4/M5 实现直接打成“已完成”语义。

## 与 HANDOFF 的衔接

- OJ 主线仍以 `docs/HANDOFF-2026-07-14.md` 为准：Phase B 真判题是工程主线。  
- 今日冻结的是**效果目标态**（三层合体），不是插队替代 Phase B。  
- 研究线与 OJ 线应分支隔离：  
  - `feature/funnel-oj-phase-b`（或继续现有 WIP）  
  - `experiment/llm-wiki-knowledge`（效果补强试验）

## 验证

- 效果结论文档已写入并可打开。  
- 本日志已写入 `docs/日志/`。  
- 运行时 log 清理命令在本环境若受审批链路影响，可本地再执行一次删除。

## 下一步

1. 你确认是否做 **WIP 分支快照 commit**（真正让 git 工作区变干净）。  
2. 若启动效果试验：另开 `experiment/llm-wiki-knowledge`，只动知识层与 Tutor 引用，不碰 judge。  
3. OJ 主线继续 Phase B：真跑测与 AC 写回。  
4. 用单主题纵向切片验收五条终局体验（10 秒定位 / 有出处 / 补弱可执行 / AC 才算会 / 知识回写）。
