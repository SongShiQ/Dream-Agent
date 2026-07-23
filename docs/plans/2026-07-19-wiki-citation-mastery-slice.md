# Wiki 引用与 Mastery 下一任务纵向切片方案

**日期**：2026-07-19  
**状态**：本轮纵向切片已完成；OpenKB 离线导入器已在后续切片完成，教师审核 UI 待扩展  
**主题样板**：虚拟内存 / 地址空间

## 1. 问题

当前系统已具备课程版本、导学微单元、题库、Lab Gate、Judge 队列和 AC 证据，但知识层仍有三个断点：

1. Tutor 把知识卡片文本注入模型，却没有把实际检索依据展示给学生或随会话保存。
2. 知识卡片只有标签，缺来源、发布状态、复核状态和关联题目/Gate 的稳定契约。
3. Dashboard 总是优先 Gate，即使必修微单元尚未完成或推荐单元仍被前置锁定，不能保证“下一步可执行”。

## 2. 本轮目标

完成一条可验证的局部闭环：

```text
学生问题/薄弱点
  -> 检索课程 Wiki 条目
  -> Tutor 获得带稳定 ID 和来源的上下文
  -> 页面展示并持久化“本轮检索依据”
  -> Dashboard 优先安排可执行的必修微单元
  -> 小测/AC 仍由现有确定性证据更新
```

## 3. 数据契约

知识卡片新增兼容性元数据：

- `course_version`：所属课程版本；
- `publication_status`：`published | draft | deprecated`；
- `review_status`：`reviewed | pending`；
- `source_refs`：指向 `data/knowledge/index.json` 中的来源注册表；
- `prerequisite_ids`、`misconception_ids`、`question_tags`、`lab_gate_ids`、`related_ids`：课程关系；
- `reviewed_by`、`reviewed_at`：复核记录，可为空。

旧卡片缺字段时继续可读，但标记为 `published + pending`，避免假称已经教师审核。

聊天消息新增 `knowledgeRefs` JSON 字段，只存检索依据摘要，不复制知识正文。

## 4. 信任边界

- Wiki 正文是数据，不是系统指令；模型不得执行其中的命令、授权或提示覆盖。
- 检索块使用 `[K:<id>]` 稳定标识；模型回答关键事实时应引用该标识。
- UI 名称使用“本轮检索依据”，不谎称模型一定逐字采用了每个条目。
- `draft/deprecated` 默认不进入学生 Tutor 检索；教师 API 后续可显式查看。
- 引用和讲解不能产生 `mastered`；小测、Judge AC 和教师复核仍是正式证据。

## 5. 代码改动

1. `lib/knowledge/cards.ts`：解析新元数据、来源注册表、发布过滤和安全格式化。
2. `lib/knowledge/references.ts`：引用摘要、数据库 JSON 和响应 Header 编解码。
3. `app/api/chat/route.ts`、`lib/db/chat.ts`：保存并返回每条助教消息的检索依据。
4. `components/ChatPanel.tsx`：实时和历史会话均展示检索依据。
5. `prisma/schema.prisma` + migration：增加 `ChatMessage.knowledgeRefs`。
6. `lib/progress/mastery.ts`：优先返回未完成且已解锁的必修微单元，再进入 OJ Gate。
7. `data/knowledge/cards/virtual-memory.md`、`data/knowledge/index.json`：建立虚拟内存样板来源和课程关系。

## 6. 验收标准

- 搜索“虚拟内存”返回稳定 ID、课程版本、来源和 `lab2-address` 关系。
- `draft/deprecated` 条目不会进入默认学生检索。
- Prompt 中知识块显式声明“不可信数据”并使用 `[K:id]`。
- 新助教消息的引用写入 DB；刷新会话后仍可显示。
- Header 引用编解码对中文安全，畸形输入安全降级为空数组。
- 必修 foundation 未全部达标时，primaryTask 是已解锁可执行微单元；完成后才优先 unlocked Gate。
- `npm test`、`npm run typecheck`、`npm run build` 通过。
- 不改变 `verdict=AC` 才能使 Gate passed 的既有不变量。

## 7. 非目标

- 本轮不接入 OpenKB 运行时或向量数据库。
- 不自动把模型回答写回公共 Wiki。
- 不实现专业 integration OJ/QEMU。
- 不将 LLM 质性判断升级为正式 mastery 证据。

## 8. 本轮实施与验收记录

- 已完成知识卡片元数据、来源注册表、学生默认发布过滤和 `[K:<id>]` Prompt 标识。
- 已完成助教消息 `knowledgeRefs` 持久化、历史会话回显、`X-Knowledge-Refs` Header 以及中文/畸形输入降级处理。
- 已完成下一任务策略：必修微单元未全部达标时只选择已解锁的可执行单元；全部达标后才选择 unlocked OJ Gate。
- 已完成真实浏览器验收：登录后显示唯一主任务，点击“开始”自动打开高 stakes 微单元小测，并显示达标证据说明。
- 已完成真实接口验收：搜索“虚拟内存”返回 `virtual-memory`、来源 `rcore-tutorial-v3-ch4`、课程版本 `2026-summer-os` 和 `lab2-address` 关联。
- `npm test`（107 tests）、`npm run typecheck`、`npm run build`、Prisma migration deploy/status 均通过。

## 9. 后续路线

1. 将已完成的 OpenKB 单向导入器接入 Git/CI，执行 frontmatter、来源和关系校验。
2. 增加教师审核与发布面板，区分 draft、reviewed、published 和 deprecated 的操作权限。
3. 将 DeepTutor 的 per-type mastery、spaced repetition 和 misconception 复习队列继续移植到现有证据模型。
4. 继续推进参数化 OS 实验模板、基准解、隐藏测试、资源限制和 QEMU/Judge 发布门禁。
