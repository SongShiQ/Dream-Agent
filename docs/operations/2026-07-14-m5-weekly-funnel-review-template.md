# M5 每周漏斗复盘模板

**适用范围**：导学约 2,000 人 → 基础组 → 专业 pilot / 项目候选的每周运营复盘。  
**原则**：倒金字塔是学习路径自然收敛，不把淘汰比例当 KPI；优先定位内容、系统、环境和助教响应问题。

## 1. 本周 cohort 概览

| 项目 | 数值 | 备注 |
|---|---:|---|
| cohortId |  | 例如 `2026-summer-os-main` |
| 导学报名人数 |  |  |
| 完成 12 题诊断人数 |  |  |
| 至少完成 1 个导学微单元人数 |  |  |
| 六个导学微单元全部达标人数 |  |  |
| 至少提交 1 个 unit gate 人数 |  |  |
| 五个 unit gate 全部 AC 人数 |  |  |
| 专业 pilot / 项目候选人数 |  | 仅为候选，不等于自动录取 |

## 2. 漏斗异常点

| 环节 | 正常判断 | 本周观察 | 初步归因 | 下周动作 |
|---|---|---|---|---|
| 诊断完成 | 新学员能在 10–15 分钟完成 |  | 题目/入口/时间安排 |  |
| OS/Rust 微单元 | 单元失败率无明显尖峰 |  | 内容难度/题目歧义 |  |
| unit OJ 首次提交 | 能看懂提交要求与 public log |  | 环境/题意/工具链 |  |
| 连续非 AC | TA 能当天处理高风险 |  | TA 负荷/反馈不足 |  |
| 队列等待 | p95 不持续增长 |  | worker/数据库/突发放量 |  |

## 3. 内容质量复核

- 本周失败率最高的 3 个微单元或 gate：
  1. 
  2. 
  3. 
- 是否存在“题目说法不清 / public example 不足 / 隐藏测试边界不合理”：
  - 
- 需要教师修订的题包或知识卡：
  - 

## 4. 系统与判题健康

| 指标 | 本周值 | 阈值/判断 | 处理结论 |
|---|---:|---|---|
| queued age p95 |  | 不能持续增长 |  |
| run time p95 |  | 按题包预算判断 |  |
| SE retry 数 |  | 可解释、可重试 |  |
| expired lease 数 |  | 应为 0 或已闭环 |  |
| 错误 AC / 错判申诉 |  | P0/P1 必须为 0 |  |

## 5. 风险队列与 TA 负荷

从 `/ops` 导出本周风险 CSV，按 `severity/status/cohortId` 过滤后填写：

| 类别 | open | acknowledged | resolved | ignored | 备注 |
|---|---:|---:|---:|---:|---|
| high |  |  |  |  |  |
| medium |  |  |  |  |  |
| low |  |  |  |  |  |

本周未及时处理的主要原因：

- 

下周 TA 值班或自动提示调整：

- 

## 6. 灰度验收快照归档

放量例会前运行：

```bash
npm run ops:release-archive -- --cohortId=2026-summer-os-main --target=foundation_200
```

如果 Linux Docker judge 主机已经通过 `npm run judge:docker-smoke`，再追加 `--docker-verified`。本地调试可用 `--dry-run` 或 `--allow-small`，但不能作为真实 30 人内测归档。

归档产物位于 `docs/operations/release-reviews/`：

- `<date>-<cohort>-<target>.md`：周会可读版，包含人工复核记录栏。
- `<date>-<cohort>-<target>.json`：机器可追踪版，包含原始 snapshot、metrics 和 risk queue。

## 7. 放量决策

选择一个：

- [ ] 保持当前规模，继续修内容/系统。
- [ ] 从 30 人内测扩大到 200 人基础组。
- [ ] 从 200 人基础组扩大到 2,000 人导学全量。
- [ ] 暂停放量并回滚题包/worker/课程版本。

签字：

- 教学负责人：
- 运营负责人：
- 技术负责人：
