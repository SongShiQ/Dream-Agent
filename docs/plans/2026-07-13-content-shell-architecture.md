# 计划：内容壳架构 + 练习体验 + 出题策略

**日期**: 2026-07-13  
**目标**: 框架可复用（壳）+ 教学内容一键导入；练习体验可读可点；出题逻辑清晰可控。

---

## 0. 调研结论（多源）

### 0.1 出题怎么来的？

| 路径 | 何时触发 | 实现 |
|------|----------|------|
| **固定题库 bank** | **默认、几乎总是** | `pickQuestion` 按难度/薄弱点/知识点从 SQLite 抽 |
| **LLM 动态出题** | **仅当整库 0 题** | `lib/agents/examiner.ts` → `generateObject` → 写入 DB |

- 有 ≥1 道题时 **不会** 调大模型补题（筛空会放宽难度，仍走 bank）。
- 你看到「题库」角标 = bank；几乎见不到「AI」除非清空题库。
- LLM 接口偏「藏」：无设置项、无「用 AI 出题」按钮；失败时 503 文案才提 API Key。

### 0.2 判分

- 纯规则 `gradeAnswer`，不用 LLM。
- 选择题契约：`options` 形如 `A. ...`，`answer` 为 `A`–`D`；UI 提交首字母。
- **审计结果**：本地 JSON 227 道 choice，**0 条** answer/options 不一致。
- 僵尸题 `answer: B` **正确**；问题是 UI **未高亮正确答案**，解析过短，学员误以为无正解。

### 0.3 内容现状（壳 vs 料）

| 内容 | 位置 | 导入方式 |
|------|------|----------|
| 题库 | `data/questions/*.json` | `npx tsx scripts/import-questions.ts`（按 content 幂等） |
| 讲义/卡片 | `data/knowledge/**/*.md` + `index.json` | 读文件，无需 import DB |
| 阶段/lab | `lib/adaptive/stage.ts` + `lib/plan/template.ts` + knowledge `stageLabs` | 代码/配置 |

**缺口**：没有统一「内容包 Content Pack」清单；老师改课要知道改哪几个目录；LLM 落库不带 stage；Exam 不传 stage 过滤。

### 0.4 业界可对齐的做法（简）

- **内容与引擎分离**：Moodle/Anki/Tutor 均为「导入包 + 运行时」。
- **银行优先 + 可选生成**：生成题应显式开关、审核后再入库（不宜静默污染题库）。
- **契约校验**：导入时 schema 校验（我们已有弱约定，缺 CI 校验脚本）。

---

## 1. 产品原则（框架只是壳）

```
┌─────────────────────────────────────────┐
│  壳（代码，少改）                          │
│  登录/地图/练习/问答/计划/lab/导入/判分     │
└─────────────────────────────────────────┘
                    ▲
                    │ 一键导入 / 热读文件
┌─────────────────────────────────────────┐
│  料（内容包，老师常改）                     │
│  questions/*.json  knowledge/**  index   │
│  （可选）content-pack.json 清单            │
└─────────────────────────────────────────┘
```

- **改课 = 改 JSON/MD + 跑 import**，不改 React 业务。
- **LLM = 可选工厂**，默认关或「生成到草稿区」，不直接当正式课标。

---

## 2. 任务拆分（执行顺序）

### Phase A — 练习体验（P0，本迭代已/将完成）

| ID | 任务 | 验收 |
|----|------|------|
| A1 | 扩展阅读默认折叠；「下一题」紧贴判题结果上方 | 不滚动也能点下一题 |
| A2 | 展开/收起改为大号 Button | 易点、对比度够 |
| A3 | 错题展示正确答案 + 选项高亮 | 僵尸题选 B 判对；选错见 B 高亮 |
| A4 | 解析写清「正确答案是 B…」 | 导入后 DB 同步 |

### Phase B — 题库健康（P0）

| ID | 任务 | 验收 |
|----|------|------|
| B1 | 脚本审计 choice answer∈options | `issues=0`（已跑） |
| B2 | `import-questions` 回填 explanation | 僵尸题解析更新 |
| B3 | npm script `content:import` / `content:audit` | package.json 可跑 |

### Phase C — 出题策略可读可控（P1）

| ID | 任务 | 验收 |
|----|------|------|
| C1 | UI 明确 `source: bank \| llm` 文案 | 「固定题库 / AI 生成」 |
| C2 | 设置或练习选项：`preferBankOnly`（默认 true） | 有题绝不 LLM；无题提示导入而非静默 AI |
| C3 | 「AI 出一题」独立按钮（forceLlm）+ 答案规范化 | 显式点击才 AI；选择题 answer 规范为 A-D |
| C4 | generate 传入 `student.currentStage` 过滤 | 导学少抽专业题 |
| C5 | 练习：上一题轨迹 + 本机收藏夹 | 好题可回看/收藏 |

**AI 出题难点（设计备忘）**

1. **质量**：幻觉、错误答案、选项无字母 → 必须规范化 + 老师审核  
2. **污染题库**：AI 题直接入库会进 bank 再被抽到 → 打标 `ai_generated`，正式课靠 import 母题  
3. **判分契约**：UI 只交 A-D；生成题必须同一格式  
4. **成本与延迟**：每次 generateObject 有 Key/时延；不宜默认每题 AI  
5. **可复现**：固定题库可回归；AI 题难复现 → 课标不以 AI 为准  

**合适做法**：默认 bank；「AI 出一题」显式；生成后入库并标注；后续可加「仅练习不入库」草稿模式。

### Phase D — 内容壳 / 一键导入（P1，架构）

| ID | 任务 | 验收 |
|----|------|------|
| D1 | `data/CONTENT_PACK.md` 说明目录与契约 | 老师照做 |
| D2 | `content-pack.manifest.json`：列出 questions/knowledge 文件与版本 | 可校验 |
| D3 | `scripts/content-import.ts`：题库 import + 可选校验 knowledge 路径存在 | 一条命令 |
| D4 | 导入前 JSON Schema 校验（type/answer/options） | 坏题拒收并报文件行 |
| D5 | 阶段配置外置（可选 yaml）— **可后置**，先 MD 文档绑定 stage 字段 | 减代码改动 |

### Phase E — 导学基础章节加深（P2）

| ID | 任务 | 验收 |
|----|------|------|
| E1 | 按章节标签补母题（每章 ≥8 题） | 章节点进去有题 |
| E2 | 章节页显示「本题库命中数」 | 空标签有提示 |

### Phase F — 文档与发布

| ID | 任务 |
|----|------|
| F1 | 更新 README：内容导入、出题优先级 |
| F2 | 提交 git + 可选 tag |

---

## 3. 本迭代执行范围（立即做）

1. **完成 A1–A4**（布局 + 正确项展示）  
2. **B1–B3** 审计 + import + npm scripts  
3. **C1** 角标文案 + **C2 轻量**：无题时优先提示导入，LLM 失败信息更清楚  
4. **D1 + D3 最小版** 内容包说明 + 统一 import 命令  
5. **写出本文计划** 供后续 Phase C3/D/E 分批做  

**不做（防膨胀）**：完整 CMS、向量 RAG、真 OJ、VS Code 扩展。

---

## 4. 风险

| 风险 | 缓解 |
|------|------|
| LLM 题污染正式库 | bank 优先；生成需确认（C3） |
| 内容 content 重复导致 import 跳过 | 审计 + 更新 explanation 走 update 路径 |
| keep-alive 多面板性能 | 观察；卡再懒挂载 |

---

## 5. 成功标准

- 学员：下一题不挡、看清对错、卡片可选读  
- 老师：改 `data/questions` + `data/knowledge` → 一键 import → 课表变  
- 开发：出题策略可解释（bank 默认，LLM 兜底/可选）  
