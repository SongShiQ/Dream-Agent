# 内容包（Content Pack）— 老师改课只改这里

框架是壳；**教学内容**放在本目录，改完导入即可，无需改 React 业务代码。

## 目录

```
data/
  questions/          # 题库 JSON（导入 SQLite）
    _schema.md        # 字段契约
    camp-*.json       # 按训练营主线分卷
    *.json
  knowledge/          # 讲义与知识卡片（运行时读文件，无需入库）
    index.json        # 标签 → 文件、阶段 → 推荐阅读
    cards/*.md
    os-theory/*.md
    rust/*.md
  labs/
    gates.json        # 实验关卡定义（OJ：unit_oj / integration_oj）
  curriculum/
    2026-summer-os/
      curriculum.json       # cohort / 阶段 / 晋级规则总入口
      foundation-units.json # 导学微单元
      required-gates.json   # 基础/专业必修 gate 契约
```

## 实验关卡（OJ）

- 定义：`data/labs/gates.json`（老师可改 checklist / 解锁链 / judgeKind）
- 进度：数据库 `LabGateProgress`（**仅 verdict=AC 可 passed**）
- 提交：`POST /api/submit` 带 `gateId`；Phase A 为 `STATIC` 静态分析，**不算过关**
- 真跑测：Phase B unit_oj（cargo test）、Phase C integration_oj（lab 脚本）
- 计划：`docs/plans/2026-07-14-lab-gates-oj-first.md`

## 课程版本（Curriculum）

- 定义：`data/curriculum/<version>/curriculum.json`
- 导学单元：`foundation-units.json`
- 必修关卡：`required-gates.json`
- 规则：课程版本只声明“哪些证据算达标”；真实达标仍来自服务端小测、工具链自检或 OJ `AC`
- 当前草案：`data/curriculum/2026-summer-os/`

## 一键导入题库

```bash
npm run content:import
# 或
npx tsx scripts/import-questions.ts
```

- 扫描 `questions/*.json`（跳过 `_` 开头）
- 按 **content 全文** 幂等：重复则跳过或回填 stage/解析
- 导入前建议：`npm run content:audit`

## 选择题契约（必须遵守）

```json
{
  "type": "choice",
  "difficulty": 50,
  "knowledgePoints": ["process", "pcb"],
  "content": "题干（全局唯一）",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "answer": "B",
  "explanation": "正确答案是 B。……",
  "stage": "professional"
}
```

- `answer` 必须是 **单个字母** `A`–`D`，且与 options 首字母一致  
- `stage`：`pre_study_theory` | `pre_study_rust` | `pre_study_tools` | `basic` | `professional` | …

## 知识卡片

- Markdown + 可选 frontmatter（tags/stage/labs/title）  
- `index.json` 的 `tagMap` 把练习标签指到 md 路径  
- 改 md 后 **刷新页面即可**（不跑 import）

## 出题策略（给老师）

| 模式 | 说明 |
|------|------|
| **固定题库（默认）** | 学员刷到的几乎都是导入题 |
| **AI 出题** | 仅当数据库 **完全没有题** 且配置了 API Key 时兜底；正式课请先 import |

正式开营：**先 import 题库**，不要依赖 AI 现场出题。

## 改课清单示例

1. 增删改 `data/questions/xxx.json`  
2. `npm run content:audit`  
3. `npm run content:import`  
4. 改讲义：`data/knowledge/**` + `index.json`  
5. （可选）阶段文案：`lib/plan/template.ts` / `lib/adaptive/stage.ts` — 后续将外置  
