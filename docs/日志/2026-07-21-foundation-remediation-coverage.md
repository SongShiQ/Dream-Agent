# Foundation 补弱知识卡覆盖与 OS 总览纵向验收日志

**日期**：2026-07-21  
**状态**：工程实现、真实临时学生流程、移动端和全量回归均通过

## 本次目标

- 继续优化不依赖陈老师排版或审批的导学/基础阶段能力。
- 验证 Foundation 错题标签不只“有题”，还必须能映射到学生可见补弱知识卡。
- 用 OS 总览与中断完成“选题 -> 全错诊断 -> `[K:id]` 补弱 -> 下一动作”的真实数据库纵向流程。
- 不修改任何知识卡 reviewer、review_status、publication_status 或实验模板状态。

## 发现的问题

- `os_overview`、`variables`、`match`、`result` 等题目标签已补齐，但多个旧知识页没有结构化 `question_tags`。
- 运行时补弱选择器只按知识卡 `questionTags/tags` 精确匹配，旧页即使正文相关，也可能无法成为稳定 `[K:id]` 推荐。
- 工具链单元的 `compiler_error` 最初没有明确知识卡映射，学生答错后可能只有 weak point，没有可点击补弱材料。

## 工程实现

### 1. Foundation 补弱覆盖审计

`lib/foundation/coverage.ts` 新增：

- `remediationCoverage[]`：每个 quiz tag 对应的学生可见 card IDs。
- `uncoveredRemediationTags[]`：没有可见补弱卡的标签。
- `missing_remediation_card`：development warning、release blocker。

只把 `publicationStatus=published` 的卡片算作运行时可用补弱材料，避免 draft/deprecated 页面让审计假通过。

### 2. 统一发布摘要与 `/ops`

- `content:release-check` 新增 `foundationUncoveredRemediationTags`。
- `/ops` Foundation 区新增“补弱卡缺口”计数。
- 每个单元有缺口时显示具体标签。
- 面板保持只读，没有增加批准、发布或状态修改入口。

### 3. 现有知识页结构化元数据

只补标签、稳定 ID、阶段和题目映射，不修改审核/发布状态：

- OS 总览：`os_overview`。
- 进程与调度：`process`、`pcb`、`scheduling`。
- 内存与虚存：`memory`、`virtual_memory`、`page_fault`。
- Rust 基础：`rust`、`variables`、`match`。
- 所有权与错误处理：`ownership`、`borrow`、`result`。
- 工具链：`tooling`、`cargo`、`compiler_error`。

`data/knowledge/rust/09-modules.md` 增加真实可执行的工具链自检和编译错误定位内容，包括：

- `cargo check`、`cargo test`；
- `git status`、`git diff`；
- 优先处理第一条主错误；
- `rustc --explain E0xxx`；
- 链接阶段 `undefined reference` 的最小排查方向。

这些内容继续保持 pending-review 边界，没有被标记为教师已审核。

## 测试

- 新增“总题量够但标签题量不足”的失败用例。
- 新增“没有补弱知识卡时产生 `missing_remediation_card`”的失败用例。
- 新增真实内容覆盖测试：六个 Foundation 单元所有 quiz tag 都有可见补弱卡。
- 直接调用运行时 `selectFoundationRemediationCards`：
  - OS 总览返回 `os-theory-01-overview` 和 `trap-syscall`。
  - `compiler_error` 返回 `rust-09-modules`。

最终全量结果：

- 42 个测试文件、174 个测试通过。
- `npm run typecheck` 通过。
- `npm run build` 通过，22 个页面/路由生成。
- 首次并行全量回归曾无断言失败但异常退出 1；缺失测试单跑通过，随后串行重跑全量 42/174 通过，最终以重跑结果为准。

## 发布检查结果

development：

- PASS
- 0 error、49 warning、0 blocker
- `foundationUncoveredTags=0`
- `foundationUndercoveredTags=0`
- `foundationUncoveredRemediationTags=0`

release：

- FAIL
- 48 blocker、1 warning
- Foundation 三类覆盖缺口均为 0
- 48 blocker 仍来自 23 张知识卡和 1 个实验模板的教师审核/发布状态
- pending/stale content decision 为 0

## OS 总览真实临时学生流程

临时学生：`foundation-remediation-rehearsal`。

1. 启动 `os-overview-interrupts` practice。
2. 题集为 5 题，覆盖 `os_overview`、`interrupt`、`trap`，无缺标签，难度 30～55、平均 45。
3. 提交 5 道空答案，结果 `failed`。
4. weak points 为 `interrupt`、`os_overview`、`trap`。
5. 补弱卡为：
   - `[K:trap-syscall]`，匹配 `interrupt/trap`；
   - `[K:os-theory-01-overview]`，匹配 `os_overview`。
6. nextAction 为“先复习三个薄弱点，再挑战下一套题”。
7. 临时学生、attempt、AnswerRecord、ReviewSchedule 均级联清理，残留为 0。

## `/ops` 390×844 验收

- 显示 `标签缺口 0 · 标签题量不足 0 · 补弱卡缺口 0`。
- `document.scrollWidth=375`，viewport 宽度 390，无横向溢出。
- 6 个单元题量、难度和实验模板来源均正常换行。
- 浏览器会话已结束。

## 当前边界

- 补弱卡覆盖为 0 只证明“每个标签有可点击材料”，不证明材料已由教师认可或真实学生一定能理解。
- 旧知识页和新增工具链段落仍是 pending-review；release check 继续诚实阻断。
- 本次没有授予任何学生 mastery，也没有改变 Lab Gate。
- 真实 OS/QEMU 实验继续暂缓。

## 下一步

1. 对 OS 总览两张核心知识卡做机器可检查的学习目标/误区/题目映射摘要。
2. 为 Foundation Dashboard 增加主题包完成度只读摘要，避免只在 `/ops` 看工程数据。
3. 继续保持教师审核和真实学生效果验证为明确边界。

