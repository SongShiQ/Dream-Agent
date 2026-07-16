# M5 灰度放量验收清单

**范围**：仅覆盖导学、微单元、基础 unit OJ、风险队列与运营面板。专业 integration OJ / rCore 整仓判题进入 M6 后另立验收。

配套材料：[M5 外部验收交接单](./2026-07-14-m5-external-validation-handoff.md)、[M5 证据索引](./2026-07-14-m5-evidence-index.md)。

## 1. 必跑命令

每次从内测扩大到更大 cohort 前执行：

```bash
npx prisma migrate deploy
npx prisma generate
npm run typecheck
npm test
npm run judge:smoke
npm run ops:release-rehearsal
npm run ops:release-archive -- --cohortId=2026-summer-os-main --target=foundation_200 --dry-run --allow-small
npm run ops:m5-readiness -- --cohortId=2026-summer-os-main
npx prisma validate
git diff --check
```

真实 Linux Docker 判题主机还需执行：

```bash
npm run judge:docker-smoke
```

本地 Windows/无 Docker 环境只能证明 `local-rules` 与容器契约代码路径，不等于生产 Docker 验收。`npm run judge:docker-smoke` 默认要求 Linux；如果为了本地 Docker Desktop 调试使用 `--allow-non-linux`，结果只能作为合同调试，不计入 M5 生产验收。

## 2. 运营快照

每次放量前从 `/ops` 导出一份灰度验收快照，或直接调用：

```bash
curl -H "x-judge-token: <token>" \
  "https://<host>/api/ops/release?cohortId=2026-summer-os-main&target=foundation_200&format=md"
```

`target` 可选：

- `pilot_30`：30 人内测。
- `foundation_200`：200 人基础组。
- `onboarding_2000`：2,000 人导学全量。

快照必须包含 cohort 漏斗、judge p95、SE、expired lease、open high/medium 风险与 GO/HOLD 结论。GO 不是自动放量授权；若存在 warn，仍需技术/教学/运营负责人确认。

本地无真实 30 人数据时，先运行 `npm run ops:release-rehearsal`。该命令会创建临时 30 人 cohort、生成 `foundation_200` 放量快照、确认 Docker 实机验证仍为 warn，并在结束后删除临时数据。它只能证明流程可跑通，不能替代真实内测数据。

真实 30 人内测结束后，运行：

```bash
npm run ops:release-archive -- --cohortId=<真实 cohortId> --target=foundation_200
```

若 `npm run judge:docker-smoke` 已在 Linux judge host 通过，可追加 `--docker-verified`。归档文件必须提交或保存到运营周会材料中。

最终进入 M6 规划前运行：

```bash
npm run ops:m5-readiness -- --cohortId=<真实 cohortId> --docker-verified --require-archive
```

该命令必须输出 `READY_FOR_M6_PLANNING`；否则继续处理表格中的 fail 项。

## 3. 从 30 → 200 的放量门槛

- [ ] 无已知错误 AC；所有 AC 可追溯到 `JudgeRun` 与 `CodeSubmission`。
- [ ] `STATIC/PENDING/WA/CE/RE/TLE/SE` 不会写入 gate passed。
- [ ] `SE` 自动重试闭环可解释，且不计入学生失败。
- [ ] 高优先级风险队列清零，medium 风险 TA 当天可处理完。
- [ ] 灰度验收快照为 GO，或 HOLD 阻塞项已有负责人签字豁免。
- [ ] 学员能在首页看到唯一主任务、达标条件、补救路径。
- [ ] 12 题诊断只推荐起点，不自动晋级。
- [ ] 六个导学微单元的 high-stakes attempt 是达标依据。

## 4. 从 200 → 2,000 的放量门槛

- [ ] queued age p95 与 run time p95 在晚高峰不持续增长。
- [ ] 风险队列支持按 `severity/status/cohortId` 筛选与 CSV/JSON 导出。
- [ ] 灰度验收快照导出并归档到周会记录。
- [ ] 每周漏斗复盘能定位异常单元/gate，而不是只看淘汰比例。
- [ ] worker 宕机、队列积压、大量 SE、错判申诉、题包回滚流程均演练过。
- [ ] 内容负责人确认没有异常失败率尖峰或题目歧义未处理。
- [ ] TA 值班容量能覆盖 high/medium 风险项。

## 5. 不允许放量的情况

- 出现越权读取/写入、身份泄露或 token 泄露。
- 出现错误 AC 或 AC 证据不可重建。
- 队列积压原因不明且 p95 持续升高。
- 某一微单元或 gate 出现异常集中失败但未复核。
- 运营面板无法导出风险队列，导致每周复盘没有证据。
- 灰度验收快照存在 fail 检查且没有负责人签字处理。
