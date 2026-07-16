# 2026-07-14 M5 Docker judge 主机验收脚本

## 背景

继续补 M5 硬验收。前序已有 Docker executor、容器镜像契约和本地 `local-rules` smoke；但真实 Linux Docker judge 主机仍缺一条可复用的端到端验收命令。本次把“构建镜像 → 临时学员 → 五个 unit gate Docker 判题 → AC 推进 → 解锁 lab1 → 清理数据”的流程固化为脚本。

## 变更

1. 新增 `scripts/smoke-docker-unit-oj.ts`
   - 默认要求运行在 Linux；非 Linux 需显式传 `--allow-non-linux`，且结果不计入 M5 生产验收。
   - 执行 `docker version`，确认 Docker daemon 可用。
   - 构建镜像：`opencamp/unit-judge-rust:2026-summer`。
   - 创建临时学生与临时 cohort。
   - 对五个基础 unit gate 逐个：
     - 创建 `CodeSubmission(PENDING)`；
     - 创建 `JudgeJob`；
     - 调用 `runUnitJudgeInDocker`；
     - 通过 `completeJudgeJobFromWorker` 写入 verdict；
     - 验证只有 Docker AC 会推进 `LabGateProgress`。
   - 验证五关后 `lab1-batch` 解锁。
   - `finally` 删除临时学生，依赖 cascade 清理关联记录。

2. 新增 npm 命令
   - `npm run judge:docker-smoke`

3. 更新文档
   - `docker/unit-judge/README.md`：加入生产 smoke 命令与非 Linux 边界。
   - `docs/operations/2026-07-14-m5-release-acceptance-checklist.md`：把真实主机命令改为 `npm run judge:docker-smoke`，并明确 Docker Desktop 调试不算生产验收。

## 本地验证

本机不是 Linux judge host，因此没有执行 `npm run judge:docker-smoke` 作为生产验收。已完成可在本机验证的部分：

- `npm run typecheck`：通过。
- `npm test`：通过，24 files / 100 tests。
- `npx prisma validate`：通过。
- `npm run judge:smoke`：通过，五个 unit gate 全部 AC，`lab1-batch` 解锁。
- `npm run ops:release-rehearsal`：通过，Docker 验证保留为 warn。
- `npm run judge:unit`：通过，无 queued job。
- 清理确认：`rehearsal students: 0`。
- `git diff --check`：通过；仅出现 Windows LF/CRLF 提示。

## 当前边界

- M5 的 Docker 主机验收脚本已具备，但真实验收仍必须在 Linux Docker judge host 上运行 `npm run judge:docker-smoke`。
- 脚本通过后，才能把灰度快照的 `dockerVerified=true` 作为可信输入。
- 真实 30 人内测数据与周复盘归档仍未完成。

