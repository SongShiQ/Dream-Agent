# 进程与调度第二主题包验收日志

**日期**：2026-07-22  
**状态**：工程实现、统一门禁、全量回归、桌面与移动端浏览器验收均通过  
**范围**：导学与基础阶段；不修改教师审核状态，不启动真实 OS/QEMU 实验

## 本次目标

复用已经通过验收的主题包和知识卡阅读契约，为“进程与调度”建立第二个真实纵向学习地图，验证同一套工程机制能够跨 Foundation 单元复用，而不是只为 OS 总览写一次性逻辑。

主题包必须由现有课程前置关系、真实题目标签和学生可见知识卡支撑，不批量创建空包。

## 实现结果

新增 `topic-process-scheduling`，并与现有 `process-scheduling` 微单元绑定：

- 3 个学习目标：程序与进程、PCB 与上下文切换、调度策略与时间片；
- 3 个典型误区：程序等同进程、PCB 只存源码、时间片越小一定越好；
- 3 个真实题目标签：`process`、`pcb`、`scheduling`；
- 2 张学生可见补弱卡：`[K:os-theory-02-process-thread]`、`[K:scheduling]`；
- 下一任务：`memory-virtual-memory`。

课程前置关系保持真实：

```text
OS 总览与中断
  -> 进程与调度
  -> 内存与虚存
```

没有修改任何 `reviewer`、`reviewed_at`、`review_status` 或 `publication_status`。

## 机器校验

第二主题包已接入 Foundation Dashboard 和统一内容发布检查，五类检查全部通过：

1. 学习目标存在且完整；
2. 典型误区覆盖全部目标标签；
3. 每个标签至少有 2 道合格题，满足 alternate-set 门槛；
4. 补弱卡对学生可见并真实覆盖误区标签；
5. 下一任务存在，且下一单元明确声明当前单元为前置。

真实题量：

| 标签 | 可用题数 | 当前门槛 |
|---|---:|---:|
| `process` | 26 | 2 |
| `pcb` | 2 | 2 |
| `scheduling` | 9 | 2 |

两个主题包当前均为 `ready=true`、`5/5`，主题包结构问题为 0。

## 自动化验证

聚焦回归：

```powershell
npx vitest run tests/foundation/topic-packs.test.ts tests/content/release-check.test.ts tests/api/foundation.test.ts --poolOptions.threads.singleThread
```

结果：3 个测试文件、12 项测试通过。

完整回归：

- `npx vitest run --poolOptions.threads.singleThread`：44 个测试文件、181 项测试通过；
- `npm run typecheck`：通过；
- `npm run build`：通过，22 个页面/路由正常生成；
- `git diff --check`：无 whitespace error，仅有 Windows CRLF 转换提示。

## 发布检查

development：

- PASS；
- 2 个主题包、0 个主题包结构问题；
- Foundation 未覆盖标签、题量不足标签、补弱卡缺口均为 0；
- 0 error、49 warning。

release：

- 按预期 FAIL；
- 48 blocker、1 warning；
- 两个主题包仍均为 `ready=true`，没有新增主题包 blocker。

48 条 blocker 主要属于 23 张知识卡和 1 个实验模板的教师审核/发布状态，不是本次工程故障，也没有被代码绕过。

## 浏览器验收

本地服务：`http://localhost:3001`。  
临时学生：`process-topic-pack-rehearsal`。

真实验收结果：

1. OS 总览与中断、进程与调度两个主题地图均显示 `5/5 项已连通`。
2. 展开进程主题地图后，3 个目标、3 个误区、3 个标签题量、2 张补弱卡和“内存与虚存”下一任务完整显示。
3. 进程单元因前置未完成保持 `locked`，单元内“开始小测”按钮为 disabled。
4. 点击 `[K:os-theory-02-process-thread]` 能打开完整 Markdown、来源和待教师复核提示。
5. 知识卡弹层中的“开始‘进程与调度’小测”同样保持 disabled，无法绕过前置条件。
6. 未启动任何小测，也未启动真实 OS/QEMU 实验。
7. 390×844 下 `document.scrollWidth=390`、`body.scrollWidth=390`，弹层宽度为 390px，无文档级横向溢出。

临时数据清理：

- 临时学生已删除；
- Assessment、AnswerRecord、FoundationQuizAttempt、ReviewSchedule、ExperimentAttempt、LabGateProgress、DailyTaskProgress、CodeSubmission、ChatSession 残留均为 0。

## 当前进度判断

导学/基础阶段的主题包机制已从“首个样板”推进到“可跨单元复用”：

```text
学习目标
  -> 典型误区
  -> 真实题目标签
  -> 错题补弱卡
  -> 课程下一任务
```

当前两个连续 OS 导学单元均已进入这一契约。工程上不再依赖陈老师排版或手工串联；教师仍负责内容表述和正式发布审核。

## 下一步

继续处理不依赖教师审批和真实实验资源的内容：

1. 以同样证据门槛审计“内存与虚存”，仅在真实题目、补弱卡和前置关系均满足时建立第三主题包；
2. 增加基础题目质量抽检样板，检查重复、歧义、答案解释和错误归因，而不只检查数量；
3. 保持知识卡阅读不授予 mastery、high-stakes 小测才形成 Foundation mastery 的边界；
4. 教师审核、reviewed-only 口径和真实学生学习效果继续作为外部验收。

