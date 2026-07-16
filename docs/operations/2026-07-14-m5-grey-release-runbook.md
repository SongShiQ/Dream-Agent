# M5 灰度、容量与运营运行手册

**日期**：2026-07-14  
**状态**：draft  
**适用范围**：导学与基础 unit OJ 灰度；不包含专业 integration OJ / 项目自动评分。

配套材料：

- [M5 每周漏斗复盘模板](./2026-07-14-m5-weekly-funnel-review-template.md)
- [M5 灰度放量验收清单](./2026-07-14-m5-release-acceptance-checklist.md)
- [M5 外部验收交接单](./2026-07-14-m5-external-validation-handoff.md)
- [M5 证据索引](./2026-07-14-m5-evidence-index.md)

## 1. 灰度阶段

| 阶段 | 人数 | 目标 | 放量条件 | 暂停条件 |
|---|---:|---|---|---|
| 内测 | 30 | 验证题意、判题、求助流程 | 无 P0/P1 错判；SE 率可解释；TA 能处理风险队列 | 出现越权、错误 AC、worker 大面积 SE |
| 小规模基础组 | 200 | 验证队列、导学分流和 TA 负荷 | p95 排队+执行达标；连续失败可被及时干预 | 风险队列积压超过 TA 当日处理能力 |
| 导学全量 | 2,000 | 验证自助分流与内容质量 | 微单元达标率稳定；队列无长期积压 | 某单元异常流失/失败率显著高于其他单元 |
| 专业 pilot | 30–60 | 收集 integration OJ 真实约束 | 另立 M6 验收 | 不与基础 unit OJ 混发 |

## 2. 每日检查清单

每天固定三次检查：开营前、中午、晚高峰后。

1. 系统
   - queued/running/completed 数；
   - expired lease 数；
   - SE retry 数；
   - queued age p50/p95；
   - run time p50/p95；
   - verdict 分布。
2. 学习
   - 诊断完成率；
   - 六个导学微单元达标率；
   - 五个 unit gate AC 率；
   - 连续 WA/CE 学员数。
3. 运营
   - 风险队列人数；
   - 高优先级风险是否清零；
   - 首次响应时长；
   - 错判/申诉是否闭环。

## 3. 风险队列规则

| 风险 | 严重级别 | 判定 | 处理动作 |
|---|---|---|---|
| `judge_expired_lease` | high | running job lease 过期 | 重启/扩容 worker，检查 Docker host |
| `judge_queue_backlog` | high/medium | queued p95 超阈值 | 暂停放量，增加 worker 或降低提交频率 |
| `judge_se_retry` | medium | SE job 自动重试中 | 查看 worker 日志；若集中在某 gate，回滚题包 |
| `student_repeated_non_ac` | medium | 同一学员最近多次 WA/CE/RE/TLE | TA 主动联系，给公开样例和错因提示 |
| `foundation_repeated_fail` | medium | 微单元 high-stakes 多次 failed | 补知识卡/换题，检查题目歧义 |
| `no_diagnostic` | low | 新学员未完成诊断 | 引导先做 12 题诊断 |

运营面板 `/ops` 必须支持按 `severity`、`status`、`cohortId` 筛选风险项，并能导出 JSON/CSV 作为每周复盘证据。系统类风险没有 cohort，按 cohort 筛选时只显示该 cohort 的学员风险。

## 4. 灰度验收快照

每次放量前，运营从 `/ops` 导出灰度验收快照。该快照聚合：

- cohort 漏斗：学员数、诊断完成、微单元开始/达标、unit OJ 开始、五关全 AC、项目候选；
- 系统健康：queued age p95、run time p95、SE、expired lease；
- 风险状态：open high / medium 风险；
- 放量结论：`GO` 或 `HOLD`，以及阻塞项。

快照是放量例会的证据入口；`GO` 仍需教学、运营、技术三方确认，`HOLD` 默认不放量，除非阻塞项有负责人签字豁免和补救计划。

## 5. 事故处理

### 5.1 worker 宕机 / 队列积压

1. 查看 `/api/judge/health`。
2. 若 expired lease > 0，重启 worker；lease 会被下一次领取回收。
3. 若 queued p95 持续增长：
   - 暂停扩大灰度；
   - 增加 worker；
   - 检查 Docker 镜像是否可用；
   - 检查数据库连接与磁盘。

### 5.2 大量 SE

1. 查看 SE 是否集中在某 gate。
2. 若集中在某题包：回滚 `data/judges/unit/<gate>.json` 或禁用该 gate 放量。
3. 若集中在 worker：检查 Docker daemon、镜像、资源限制。
4. SE 不计入学生失败；系统恢复后自动重试。

### 5.3 错判申诉

1. 保留 `CodeSubmission`、`JudgeJob`、`JudgeRun`。
2. 教师复核题包和 publicLog/rawLog。
3. 若确认错判：
   - 修题包；
   - 记录版本；
   - 对受影响提交重新入队或人工补偿；
   - 公告影响范围。

### 5.4 课程版本/题包回滚

1. 禁止直接修改历史 migration。
2. 题包回滚以 Git commit 为单位。
3. 回滚后运行：
   - `npm run typecheck`
   - `npm test`
   - `npm run judge:smoke`
4. 通过后再恢复灰度。

### 5.5 身份泄露/越权

1. 暂停写接口。
2. 轮换相关 token。
3. 检查 API 是否仍从 session 推导 student。
4. 导出受影响学生/提交范围。
5. 修复后再开放。

## 6. 放量门槛

从 30 → 200：

- 无错误 AC；
- `judge:smoke` 持续通过；
- 风险队列高优先级清零；
- 风险项状态可被标记为 `open`、`acknowledged`、`resolved`、`ignored`，并可导出给周会复盘；
- 灰度验收快照没有 fail 检查项；
- TA 能在当天处理完中优先级风险；
- SE 原因可解释且有重试闭环。

从 200 → 2,000：

- queued p95 与 run p95 稳定；
- 微单元失败率无异常尖峰；
- 单个 gate 不出现异常集中失败；
- 运营 runbook 已演练 worker 宕机、题包回滚、错判申诉。
- 每周漏斗复盘模板至少完成一次，能说明异常流失来自内容、环境、系统还是学习基础。
- 灰度验收快照已归档，并能解释所有 warn 项。

## 7. 明确不以淘汰率为目标

倒金字塔是学习路径自然收敛，不是 KPI。每周复盘重点是：

- 哪个微单元/关卡造成异常流失；
- 是内容问题、环境问题、题目歧义还是学习基础问题；
- 如何减少无意义挫败，让真正有能力的学生进入项目阶段。
