# 计划：四段学习流 + 实验关卡 + 专业阶段 IDE 优先

**日期**: 2026-07-14  
**状态**: 部分被升级 — 过关标准见 **`2026-07-14-lab-gates-oj-first.md`（OJ 纪律 + 进度 DB）**  
**对齐共识（更新）**: 导学线上测 → 基础 rustlings **真 OJ** → 专业 IDE 编码 + **真跑测 AC 过关** → 项目交还老师；**禁止**仅靠清单/自报/静态分标 passed

> 复核提示：本文保留 IDE-first 的产品分工判断，但其中“清单过关 / 自报本地测试 / 静态分”的通过规则已被 OJ-first 与倒金字塔方案取代。后续实现以 `verdict=AC`、服务端证据和教师人工复核为准。

---

## 0. 问题与共识

### 0.1 现状缺口

| 能力 | 现状 | 问题 |
|------|------|------|
| LabPanel | 单文件粘贴 + 静态分析 | 不适合 lab2+ 多文件、大改内核 |
| CLI | init/status/submit 对齐 studentId | 有，但未做成「关卡过关」主路径 |
| 阶段 | 已细粒度 14 步 + 大章横栏 | 与「实验关卡完成」未绑定 |
| 练习 | 经典 ‖ AI 双轨 | 导学强、专业弱绑定 lab |
| 项目 | 有 stage | 未定义「助教主路径完成」 |

### 0.2 产品共识（本计划冻结）

1. **网页不是专业阶段的主编辑器**；专业 lab = IDE（VS Code 等）+ CLI/网页提交 + 自动评测 AC 反馈。  
2. **基础**可以是 rustlings 级小练习或 lab1 级小步，允许网页粘贴/轻量编辑。  
3. **导学**以线上测为主（选择/填空/判断/简答），实验可选极轻。  
4. **项目**跟老师大纲；标记「助教主路径完成」≠ 课程毕业。  
5. **经典题库**加型加难；**AI** 并行加练，不当摸底主尺子。

---

## 1. 四段学习流（目标体验）

```text
┌──────────── 导学大章 ────────────┐
│ 地图小节 · 今日三步               │
│ 水平评估：经典题库分层卷           │
│ 练习：经典（选择/判断/填空/简答）  │
│       ‖ AI 变式加练               │
│ 过关：题量 + 正确率 + 薄弱点       │
└───────────────┬──────────────────┘
                ▼
┌──────────── 基础大章 ────────────┐
│ 小练习（rustlings 风格）± lab1    │
│ 网页可粘贴片段 / CLI 提交         │
│ 每关：清单 + 概念题 2～3 + 静态分  │
│ 过关：清单勾完 + 概念门槛          │
└───────────────┬──────────────────┘
                ▼
┌──────────── 专业大章 ────────────┐
│ lab2～5：IDE 优先（半自由探索）    │
│ 网页：关卡页 = 目标/文档/清单/     │
│       卡点问答/本关概念坑          │
│       不提供「整仓编辑器」         │
│ CLI：status / submit 片段反馈      │
│ 过关：清单 + 自报本地测 + 概念坑   │
└───────────────┬──────────────────┘
                ▼
┌──────────── 项目大章 ────────────┐
│ 助教主路径完成仪式                 │
│ 老师大纲；助教：计划/问答/清单模板 │
│ 不替代答辩与评分                   │
└──────────────────────────────────┘
```

### 1.1 各阶段「主战场」

| 大章 | 主战场 | 网页角色 | IDE 角色 |
|------|--------|----------|----------|
| 导学 | 网页测评 | 主 | 无 |
| 基础 | 网页 + 轻 IDE | 主或双 | 可选 |
| 专业 | **IDE** | 导航/清单/答疑/概念坑 | **主编辑** |
| 项目 | IDE + 老师 | 弱辅助 | 主 |

---

## 2. 实验关卡模型（核心抽象）

### 2.1 内容包（老师可改，不进业务硬编码）

建议新增（执行时）：

```text
data/labs/
  gates.json          # 关卡清单注册表
  lab1-batch.md       # 或 split: env-setup, lab1-batch, …
  lab2-address.md
  …
```

**Gate 记录字段（概念）：**

```ts
type LabGate = {
  id: string;              // lab2-address
  title: string;
  chapter: 'basic' | 'professional' | 'pre' | 'project';
  stageIds: string[];      // 绑定细粒度 stage
  mode: 'web_snippet' | 'ide_first';  // 基础 vs 专业
  docLinks: { label: string; url: string }[];
  checklist: { id: string; text: string; required: boolean }[];
  conceptTags: string[];   // 本关概念题标签
  minConceptCorrect?: number; // 如 2
  order: number;
};
```

**学员进度（DB 或先 local + 后 DB）：**

```ts
type GateProgress = {
  studentId: string;
  gateId: string;
  checks: Record<string, boolean>; // checklist id → done
  conceptPassed: boolean;
  lastSubmitId?: string;
  status: 'locked' | 'active' | 'done';
  updatedAt: string;
};
```

### 2.2 过关条件（默认）

| mode | 过关 |
|------|------|
| `web_snippet`（基础） | 仅在 `unit_oj` 返回 AC 后标记 passed；清单/概念题只作为学习辅助或额外条件 |
| `ide_first`（专业） | 仅在 `integration_oj` 返回 AC 后标记 passed；清单、自报本地测试与 submit 留痕不能替代 AC |
| project | 不自动过关；仅「助教主路径完成」一次性标记 |

---

## 3. 专业阶段：为何不在网页编整段 lab

| 事实 | 产品结论 |
|------|----------|
| lab2+ 多文件、跨模块、长周期 | 网页单 textarea **不胜任主编辑** |
| 半自由探索、对照 rCore 文档 | 需要本地仓库、Git、调试器 |
| 助教价值 | **引导、清单、卡点问答、概念坑、submit 反馈**，不是当 IDE |

**Lab 页转型（专业）：**

```text
[当前关 lab3-process]
文档链接 | rCore 章节
检查清单 □ □ □（可勾选同步）
「在 VS Code 中打开」说明 + 复制 student id / CLI 命令
卡点：一键过关概念 3 题 | 智能问答
可选：粘贴「关键片段」静态分析（辅助，非主路径）
过关按钮（条件满足后）
```

**基础：** 可保留较大粘贴区 + rustlings 式小任务列表。

---

## 4. 导学题型扩展（与「考核不单调」）

| 题型 | 判分 | 优先级 |
|------|------|--------|
| choice | 已有 | P0 加量加难 |
| fill | 已有 | P0 |
| judge（判断） | 扩展 type + grade | P1 |
| short（简答） | 关键词要点 / 自评 + 助教 | P1 |

内容仍走 `data/questions` + `content:import`。

---

## 5. 与经典 / AI / 评估的关系（冻结）

| 场景 | 策略 |
|------|------|
| 水平评估 | **仅经典分层卷** + 排除近期题；稳定可比 |
| 日常练习 | **经典 ‖ AI 并行**（已有 UI） |
| 关卡内概念坑 | 优先经典本 lab 标签；不足时提示 AI 变式 |
| 升阶 | 导学：题量+正确率+薄弱；基础/专业：**关卡 done** + 轻量概念 |

**不把 AI 出卷作为摸底/晋级主尺子。**

---

## 6. 分阶段实施（执行顺序）

### Phase 0 — 文档与契约（0.5～1 天）✅ 本文

- 冻结四段流、ide_first vs web_snippet、项目边界  
- `CONTENT_PACK` 增补 labs 目录说明  

### Phase 1 — 关卡内容最小集（1～2 天）

- `data/labs/gates.json`：env-setup、lab1、lab2～5、project-final  
- 每关 4～8 条 checklist + docLinks + conceptTags  
- 不先做复杂 UI，可用 MD 渲染清单  

### Phase 2 — 关卡进度 API + 最小 UI（2～3 天）

- Prisma `LabGateProgress` 或先 student 上 JSON 字段  
- `GET/PUT /api/labs/gates`：读关卡定义 + 进度、勾选、标记 done  
- **LabPanel 改造**：  
  - 按 stage 显示当前关  
  - `ide_first`：弱化编辑器，强化清单/CLI/链接  
  - `web_snippet`：保留粘贴区  
- 地图节点「本关进度」角标（可选）  

### Phase 3 — 基础小练习（rustlings 风格）（2 天）

- gates 中 `kind: micro_exercise`  
- 单文件任务 + 通过标准（清单或静态规则）  
- 与 basic_batch / basic_trap 绑定  

### Phase 4 — 导学题型（1～2 天）

- judge + short 契约与 grade  
- 导学卷抽题类型混合  
- 内容包补一批判断/填空  

### Phase 5 — 助教主路径完成（0.5～1 天）

- 当 `prof_concurrency`（或配置的最后专业关）done → 可点「完成助教主路径」  
- 进入 project 时展示仪式文案 + 老师大纲入口  
- 报告中增加「主路径完成」字段  

### Phase 6 — 打磨与文档（1 天）

- CLI 帮助文案与关卡 id 对齐  
- README / CONTENT_PACK 更新  
- 狗粮剧本：导学测 → 基础关 → 专业 IDE 流  

**合计粗估：约 1.5～2.5 周**（视是否上 DB、内容是否齐）。

---

## 7. 明确不做（本计划外）

- 网页多文件 IDE / LSP  
- Docker 真跑 QEMU 自动判 lab  
- 替代老师项目评分  
- 全 AI 自动生成整关 checklist（可后期辅助）  

---

## 8. 成功标准

| 角色 | 标准 |
|------|------|
| 导学学员 | 只刷网页测评也能感到阶段推进 |
| 基础学员 | 完成 2～3 个小关（清单+概念），不必上完整内核 IDE 流 |
| 专业学员 | **默认在 VS Code 干活**；网页只当任务板与答疑 |
| 老师 | 改 `data/labs` + questions 即改关卡，少改代码 |
| 产品 | 进项目前可展示「助教主路径完成」 |

---

## 9. 风险

| 风险 | 缓解 |
|------|------|
| 清单靠自觉勾选 | 清单只能表示 `personal_done`；专业关必须由 integration OJ 的 AC 或老师复核产生达标证据 |
| 关卡与课表不一致 | gates.json 外置，跟老师改 |
| 基础硬凑 5 实验 | 数量以课表为准，默认 2～3 硬关 |
| 与细粒度 stage 双轨混乱 | stage 解锁建议仍保留；**硬过关以 gate done 为准** |

---

## 10. 建议确认点（你拍板后执行）

1. 基础硬关列表是否固定为：`env-setup` + `lab1-batch`（可拆 trap）还是课表另有 3～5？  
2. 专业过关是否 **必须** CLI/网页至少 submit 一次？  
3. 进度是否必须上 DB（多设备）还是先 localStorage 足够？  
4. Phase 1～2 是否作为下一开发迭代 P0？  

---

## 11. 一句话

**专业阶段不适合网页编整仓代码；助教应做成 IDE 侧的任务板与关卡系统。**  
导学线上考、基础小关可网页、专业 VS Code 半自由探索、项目交还老师——按上表 Phase 0→6 落地即可。
