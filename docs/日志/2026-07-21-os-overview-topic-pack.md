# OS 总览纵向主题包与学生学习地图日志

**日期**：2026-07-21  
**状态**：工程实现、统一门禁、学生侧桌面/移动端验收均通过  
**范围**：仅导学与基础阶段；不修改教师审核状态，不启动真实 OS/QEMU 实验

## 本次目标

把此前只存在于 `/ops` 的 Foundation 题量、标签和补弱卡覆盖，收敛成第一个学生可理解、工程可复验的纵向主题包。选定主题为“OS 总览与中断”，要求一份权威数据同时回答：

1. 学生学完后应该会什么；
2. 需要纠正哪些典型误区；
3. 哪些题目标签负责检查；
4. 答错后能进入哪些学生可见知识卡；
5. 达标后的下一任务是什么。

本切片不依赖陈老师排版、审批或实验资源，也没有修改任何知识卡或实验模板的 `reviewer`、`review_status`、`publication_status`。

## 实现内容

### 1. 主题包权威数据

新增：

- `data/curriculum/2026-summer-os/foundation-topic-packs.json`

首个主题包 `topic-os-overview-interrupts` 包含：

- 3 个学习目标；
- 3 个典型误区；
- `os_overview`、`interrupt`、`trap` 三个题目标签及学生可读名称；
- `[K:os-theory-01-overview]`、`[K:trap-syscall]` 两张补弱知识卡；
- 下一任务 `process-scheduling`。

### 2. 机器校验

新增 `lib/foundation/topic-packs.ts`，使用 Zod 解析主题包数据，并检查：

- 主题包版本与 Foundation 课程版本一致；
- 主题包指向真实微单元，且必需主题包不能缺失或重复；
- 主题标签与微单元 `quizTags` 完全一致；
- 每个题目标签至少映射到一个典型误区；
- alternate set 策略下，每个标签至少有 2 道合格题；
- 每个误区的补弱卡存在、对学生可见，并真实覆盖对应标签；
- 下一微单元存在，且课程前置关系声明当前单元为 prerequisite。

五类检查统一输出：学习目标、典型误区、题目覆盖、补弱卡、下一任务。任一结构断裂都会使主题包 `ready=false`。

### 3. 接入发布门禁

`lib/content/release-check.ts` 新增：

- `foundation_topic_pack` 问题类型；
- `foundationTopicPacks` 数量；
- `foundationTopicPackIssues` 问题数；
- `details.foundationTopicPacks` 机器可读明细。

规则保持与现有 Foundation coverage 一致：

- development：结构问题为 warning；
- release：结构问题为 blocker；
- 不自动修内容，也不替教师批准内容。

当前结果：

- 主题包：1；
- 结构问题：0；
- `ready=true`；
- 三个标签实际题量：`os_overview=2`、`interrupt=11`、`trap=24`；
- 两张补弱卡均为学生可见；
- 下一任务“进程与调度”前置关系有效。

### 4. 学生侧学习地图

`buildFoundationDashboard` 现在从真实题库、课程关系和学生可见知识卡计算主题包摘要，API 不返回教师运维问题明细。

`components/FoundationUnitPanel.tsx` 在对应微单元中增加可展开的“主题学习地图”，显示：

- `5/5 项已连通`；
- 三个学习目标；
- 三个典型误区；
- 每个小测标签的真实题量；
- 两张稳定 `[K:id]` 补弱卡；
- 达标后的下一任务。

`/ops` 同时保留只读工程摘要，便于区分“学生看到的学习路线”和“运营看到的结构检查”。

## 测试

新增 `tests/foundation/topic-packs.test.ts`：

- 读取真实课程、题库和知识卡，要求 OS 总览主题包 5/5 连通；
- 验证学生摘要不暴露运维 issue；
- 验证缺卡、错配卡、无效下一任务能够被发现；
- 验证删除必需主题包会产生 `missing_required_topic_pack`。

补充：

- `tests/content/release-check.test.ts`：development warning / release blocker；
- `tests/api/foundation.test.ts`：Dashboard API 保留学生主题包摘要。

验证结果：

- 聚焦测试：3 个文件、12 个测试通过；
- 全量测试：43 个测试文件、177 个测试通过；
- `npm run typecheck`：通过；
- `npm run build`：通过，22 个页面/路由生成；
- `git diff --check`：无 whitespace error，仅有既有 Windows CRLF 提示。

## 发布检查

development：

- PASS；
- 0 error、49 warning；
- 1 个主题包、0 个主题包结构问题。

release：

- FAIL；
- 48 blocker、1 warning；
- 1 个主题包、0 个主题包结构问题。

48 个 blocker 仍来自教师内容状态，本切片没有绕过或改变它们。

## 浏览器验收

使用临时学生 `topic-pack-rehearsal` 验证真实 Dashboard：

- 桌面 1280px：主题地图自动展开，文字、按钮和右侧栏无重叠；
- 移动端 390×844：`document.scrollWidth=390`，无文档级横向溢出；
- 长学习目标、误区、标签题量和 `[K:id]` 均正常换行；
- 当前 OS 单元显示 5/5，下一单元仍按服务端前置关系保持锁定；
- 临时学生随后级联删除，残留为 0。

页面中的学习路径章节导航自身保留横向滚动，但没有撑宽文档；这属于既有布局行为，不是本切片新增溢出。

## 当前边界

- `5/5 已连通`只表示工程关系完整，不表示陈老师已经认可三条学习目标和三条误区的教学表述。
- 题量表示符合标签和阶段的可用题数，不表示题目质量已完成教师抽检。
- 知识卡当前按既有学生可见规则返回，本切片没有决定 reviewed-only 发布口径。
- 下一任务只声明课程顺序；真实学生是否理解并顺利迁移仍需后续试点。
- 真实 OS/QEMU Judge 继续暂缓。

## 下一步

继续做不依赖教师审批的前两阶段工程项：

1. 把主题包中的 `[K:id]` 从只读文字推进为可直接打开知识卡的学生操作；
2. 为 OS 总览增加“读卡 -> 开始小测”的明确任务切换，避免学习地图只说明不执行；
3. 抽取通用主题包完成度组件，为“进程与调度”复用，但不在没有内容证据时批量制造空主题包；
4. 教师内容确认、题目质量抽检和真实学生试点继续作为外部验收，不由代码代签。
