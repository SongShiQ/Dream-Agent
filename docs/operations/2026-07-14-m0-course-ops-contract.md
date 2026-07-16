# M0 课程与运营契约

**状态**：草案，待教学/产品/运维确认  
**日期**：2026-07-14  
**目标**：冻结倒金字塔训练营进入 M1/M2/M3/M4 前必须一致的课程、权限、灰度和项目候选规则。

## 1. 文档口径

| 文档 | 用途 | 优先级 |
|---|---|---|
| `docs/plans/2026-07-14-funnel-oj-detailed-work-plan.md` | 实施主计划 | 最高 |
| `docs/plans/2026-07-14-funnel-oj-phase-ab-design.md` | 产品与架构设计 | 高 |
| `docs/plans/2026-07-14-lab-gates-oj-first.md` | OJ 原则与历史演进 | 中 |
| `docs/plans/2026-07-14-lab-gates-ide-first.md` | IDE-first 分工判断 | 低；过关规则已被 OJ-first 取代 |

## 2. 角色与权限

| 角色 | 可以做 | 不可以做 |
|---|---|---|
| student | 查看自己的首页、计划、题目、提交、gate 状态；提交已解锁 gate；标记个人待办 | 读取他人数据；声明自己的 AC；修改课程规则 |
| ta | 查看分配 cohort/风险队列；查看学生证据与公共日志；发起跟进记录 | 手动写 OJ passed；替代老师给项目最终分 |
| teacher | 配置课程版本、题库、gate、项目候选复核；确认人工复盘 | 绕过 OJ 把基础/专业 gate 批量置 passed，除非走异常申诉流程并留审计 |
| admin | 配置身份系统、数据库、worker、审计与备份 | 直接修改成绩证据而不留审计 |

## 3. cohort 默认节奏

| 阶段 | 规模预算 | 默认节奏 | 晋级证据 |
|---|---:|---|---|
| 导学 | 2,000 | 1-2 周，低成本自助 | 12 题诊断仅推荐起点；六个微单元小测达标 + 工具链自检 |
| 基础 | 400-600 | 1-2 周，unit OJ | 规定基础 gate 全部 AC + 概念小测达标 |
| 专业 | 120-200 | 2-4 周，IDE-first + integration OJ | 规定专业 lab AC + 提交记录完整 |
| 项目 | 约 60 | 老师项目节奏 | 项目候选人工复核通过；最终评价由老师决定 |

人数是容量预算，不是淘汰配额。不能为了凑比例放宽 AC，也不能把 2,000 到 60 写成自动淘汰逻辑。

## 4. 首批内容冻结

导学必修微单元见 `data/curriculum/2026-summer-os/foundation-units.json`。

基础 unit OJ 首批五关见 `data/curriculum/2026-summer-os/required-gates.json`：

| 目标 gate | 当前兼容 alias | 技能 |
|---|---|---|
| `env-check` | `env-setup` | 工具链与环境 |
| `rust-variables` | `rustlings-variables` | 变量、可变性、基础类型 |
| `rust-ownership` | `rustlings-move` | move、borrow、生命周期直觉 |
| `rust-result` | 待新增 | Result 与错误处理 |
| `basic-syscall-model` | 待新增 | 系统调用抽象模型 |

M1/M4 实现时应统一 gate id；统一前 dashboard 可通过 alias 兼容现有草案。

## 5. 项目候选公开文案

建议展示给学员：

> 完成专业阶段规定 lab 的 AC 和复盘材料后，你将进入项目候选池。项目候选不是自动录取，最终项目名额由老师结合协作记录、投入时间、复盘质量和项目需要统一确认。平台会展示证据和进度，但不会自动给出项目最终分。

## 6. 灰度节奏

| 批次 | 人数 | 目标 | 放量条件 |
|---|---:|---|---|
| dogfood | 5-10 | 团队自测内容、身份、提交和日志 | 无阻断 bug；证据口径正确 |
| 内测 | 30 | 验证题意、导学闭环和 unit OJ 正确性 | 无严重错判；求助路径可用 |
| 基础灰度 | 200 | 验证队列、数据库和 TA 负荷 | p95 延迟、SE 率、风险队列可控 |
| 导学全量 | 2,000 | 验证自助分流与内容质量 | 每周复盘无异常流失点 |

## 7. M0 签字项

| 项 | 推荐默认 | 负责人 | 状态 |
|---|---|---|---|
| 身份体系 | 学号/邮箱登录 + session | 产品/后端 | 待确认 |
| 正式数据库 | PostgreSQL | 后端/运维 | 待确认 |
| 判题 worker | 独立 Linux Docker worker | 运维/后端 | 待确认 |
| 导学单元 | 六个微单元 | 教师 | 待确认 |
| 基础 gate | 五个 unit gate | 教师/内容 | 待确认 |
| 项目候选复核 | 专业 AC + 提交记录 + 人工复盘 | 教师/运营 | 待确认 |

## 8. 进入 M1 的条件

- 本文档签字项没有阻塞性反对意见。
- ADR 认证/数据库与判题运行环境完成负责人确认。
- curriculum version、foundation units 和 required gates 有明确版本号。
- 已决定 PostgreSQL 和 Linux worker 的具体落点，或明确 M1 只做本地验证不做生产承诺。
