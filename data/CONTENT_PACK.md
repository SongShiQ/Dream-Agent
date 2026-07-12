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
```

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
