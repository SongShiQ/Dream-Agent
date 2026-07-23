# 学生参数化预实验流程方案

**日期**：2026-07-19  
**状态**：已实现  
**范围**：模板目录、开始/恢复、服务端判分、历史记录与 LabPanel 展示

## 目标

把受控实验模板接入学生实验页，同时保持它与正式 OJ 证据完全分离。学生可以获得稳定变式和即时反馈，但不能通过请求字段、答对预实验或篡改响应获得 mastery、Gate passed 或 AC。

## 发布与信任边界

- 学生目录只返回当前课程中 `publicationStatus=published` 且 `reviewStatus=reviewed` 的模板。
- draft/pending 模板只贡献非敏感的待审核数量，不返回标题、题面、输入、答案或隐藏覆盖。
- 开始实例只接受 `templateId`；服务端决定 learner key、sequence、variantIndex、prompt 和 input。
- `ExperimentAttempt` 不保存 expected 或隐藏样例。提交时从受审模板版本和 `variantIndex` 重建 expected。
- 客户端提交的 `isPassed`、`gatePassed`、`expected` 等额外字段不会进入判分或数据库更新。
- 所有响应都显式声明 `formative=true`、`masteryImpact=none`、`gatePassed=false`。
- 该流程不读写 `CodeSubmission`、`JudgeJob`、`LabGateProgress`、`FoundationQuizAttempt` 或 `ReviewSchedule`。

## 数据模型

`ExperimentAttempt` 保存：

- 学员、课程、模板及模板版本；
- 实例 ID、variantIndex、题面和输入快照；
- `in_progress/submitted` 状态、答案、正确性和反馈；
- `activeKey`，保证每位学员在同课程同模板中最多一个进行中实例；
- 开始和提交时间。

提交后清空 `activeKey`，学生即可生成下一道确定性变式。并发开始触发唯一键竞争时，服务端返回已经创建的进行中实例。

## API

`GET /api/experiments`

- 返回可用模板、非敏感 availability 汇总、当前学生最近十次 attempt 和固定 formative policy。

`POST /api/experiments`

- `action=start`：验证发布门禁，恢复进行中实例或按历史次数生成新变式。
- `action=submit`：验证所有权与状态，按服务端模板重建答案并写入形成性结果。
- 提交使用 `id + studentId + in_progress` 条件更新，避免并发重复请求覆盖已经形成的结果。
- 模板被撤回审核/发布后，历史题面不再通过学生目录返回，进行中的实例也不能继续提交。
- 答案长度限制为 1–80 字符。

## UI

`LabPanel` 中的“参数化预实验”独立于 Gate OJ 卡片和提交时间线：

- 当前只有 draft/pending 样板时显示“教师审核中”；
- 有发布模板时显示标题、来源和关联 Gate，并强调“不直接过关”；
- 支持恢复未完成题目、提交答案、查看参考判定与再做一题；
- 刷新后仍展示最近形成性结果；历史统计只称为练习记录，不使用 AC、passed 或 mastered 文案。

## 后续边界

当前仍没有 QEMU integration worker、基准解仓库、隐藏测试签名和资源强制执行。地址转换模板是可生成、可判分的 formative 预实验，不是专业 Lab AC Judge。
