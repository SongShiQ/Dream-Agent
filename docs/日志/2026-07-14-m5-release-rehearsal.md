# 2026-07-14 M5 30 人灰度快照演练脚本

## 背景

继续推进 M5 的硬验收。真实 Linux Docker worker 与真实 30 人内测数据仍需外部环境配合；本次先把“30 人灰度数据 → 放量快照 → 清理临时数据”的彩排流程固化为脚本，避免后续运营演练依赖手工造数或页面点击。

## 变更

1. 新增 `scripts/rehearse-release-snapshot.ts`
   - 创建临时 cohort：`rehearsal-30-<timestamp>`。
   - 模拟 30 名学员：
     - 28 人完成诊断；
     - 24 人开始导学微单元；
     - 22 人有微单元达标记录；
     - 12 人开始 unit OJ；
     - 8 人五个 unit gate 全部通过；
     - 4 人为项目候选。
   - 调用 `buildReleaseSnapshot({ target: 'foundation_200' })` 生成快照。
   - 校验关键漏斗数与 GO/HOLD 结论。
   - 本地演练明确传入 `dockerVerified: false`，因此 Docker 实机验证保留为 `warn`，不冒充生产验收。
   - `finally` 中按 cohort 删除临时学员，依赖 Prisma cascade 清理相关记录。

2. 新增 npm 命令
   - `npm run ops:release-rehearsal`

3. 更新放量验收清单
   - 将 `npm run ops:release-rehearsal` 加入 M5 必跑命令。
   - 明确该命令只能证明流程可跑通，不能替代真实内测数据和 Linux Docker worker 实机验证。

## 验证

- `npm run ops:release-rehearsal`：通过，输出 30 人灰度验收 Markdown 快照。
- `npm run typecheck`：通过。
- `npm test`：通过，24 files / 100 tests。
- `npm run judge:smoke`：通过，五个 unit gate 全部 AC，`lab1-batch` 解锁。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现 Windows LF/CRLF 提示。
- `npm run judge:unit`：通过，无 queued job。
- 清理确认：`rehearsal students: 0`。

## 当前边界

- 本脚本是运营彩排，不是正式灰度数据。
- Docker 实机验证仍需在真实 Linux 判题主机执行。
- M5 完整完成仍需要至少一次真实 30 人内测快照和周复盘归档。

