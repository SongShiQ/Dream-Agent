# ADR 2026-07-14: 判题运行环境与 OJ 边界

**状态**：建议采纳，待运维与教学负责人确认  
**适用范围**：基础 unit OJ、专业 integration OJ、项目候选前置证据  
**关联计划**：`docs/plans/2026-07-14-funnel-oj-phase-ab-design.md`

## 背景

基础阶段需要运行 Rust 单文件或小 crate 测试，专业阶段需要运行课程仓库、脚本和可能的 QEMU 测例。任意学员代码都不能在 Web 进程、Serverless 函数或无隔离环境中直接执行。当前 `/api/submit` 只做静态分析，不能称为真实 OJ，也不能形成晋级证据。

## 决策

1. Web 服务只负责校验、入队、查询和展示结果，不直接运行学员代码。
2. 判题由独立 Linux worker 执行。开发期可用单机 worker，正式承载前必须迁移到 Linux Docker 环境。
3. 每次提交创建 `CodeSubmission(PENDING)` 与 `JudgeJob(queued)`；worker lease job 后运行判题，写入 `JudgeRun` 与最终 verdict。
4. 只有受保护的 judge complete 通道能写 verdict；只有 `verdict=AC` 能在同一事务中写入 `LabGateProgress.passed`。
5. `STATIC` 只能表示旧的静态反馈，不参与 gate passed、不解锁后继关、不计入基础升专业证据。

## 运行约束

| 项目 | unit OJ 默认 | integration OJ 默认 |
|---|---:|---:|
| 容器 | Docker，一提交一容器 | Docker，一提交一容器 |
| 用户 | 非 root | 非 root |
| 网络 | 禁用 | 禁用，除非课程镜像预置依赖不足且负责人批准 |
| rootfs | 只读 | 只读 |
| CPU | 1 core | 1-2 core，按 lab 调整 |
| 内存 | 512 MiB | 1-2 GiB，按 lab 调整 |
| PID | 64 | 128 |
| 临时磁盘 | 64 MiB | 按 lab 设置上限 |
| 总时限 | 20 秒 | 60-180 秒，按 lab 设置 |
| 公共日志 | 32 KiB 截断 | 64 KiB 截断 |

## 状态机

```text
submit
  -> CodeSubmission(PENDING) + JudgeJob(queued)
  -> JudgeJob(running)
  -> JudgeRun(verdict)
  -> AC: 单事务写 submission.isPassed=true + LabGateProgress.passed
  -> WA/CE/RE/TLE: 记录失败，不写 passed
  -> SE: 系统异常，可有限重试，不计学生失败
```

## 阶段边界

| 阶段 | 判题范围 | 不做事项 |
|---|---|---|
| Phase A | migration、状态机、受保护 complete、API/UI 口径 | 不声称已能真实判题 |
| Phase B | 五个基础 unit gate，cargo test/rustc test | 不跑 rCore 整仓，不上传任意命令 |
| Phase C/M6 | 专业 integration OJ，基线仓库 + patch + 课程脚本 | 不做网页多文件 IDE，不自动评分项目 |

## 未决问题

1. Linux worker 由哪台机器或哪家云服务承载。
2. 课程镜像维护人、镜像发布节奏与回滚方式。
3. integration OJ 第一关选择 lab1 还是另一个可脚本化实验。

## 验收

- 浏览器无法调用内部 complete 接口写 AC。
- 伪造 `isPassed`、`verdict`、`judgeLog` 的提交都不能使 gate passed。
- 重复 complete、并发 complete 和非 AC complete 都保持幂等且不破坏进度。
- 容器安全检查通过：无网络、非 root、不可写宿主、超限稳定终止。
