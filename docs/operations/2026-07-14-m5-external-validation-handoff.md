# M5 外部验收交接单

**日期**：2026-07-14  
**适用范围**：M5 最终外部事实验收。仅覆盖导学、基础 unit OJ、灰度运营；不包含 M6 专业 integration OJ / rCore 整仓判题。  
**结论先行**：本地工具链已经就绪，但 M5 不能仅凭本地验证完成。必须补齐真实 Linux Docker judge host smoke 与真实 30 人 cohort 归档。

## 1. 角色与输入

| 角色 | 需要提供 | 产出 |
|---|---|---|
| 技术/运维 | Linux Docker judge host、项目代码、数据库连接、Node/npm、Docker daemon | Docker smoke 输出 |
| 教学/运营 | 真实 30 人内测 cohortId、内测周期结果、风险处理状态 | release archive 与周复盘 |
| 项目负责人 | 判定 warn/fail 项是否可接受 | 是否允许进入 M6 规划 |

## 2. 执行顺序

### Step 1：代码与数据库准备

在目标环境拉取同一份代码后执行：

```bash
npx prisma migrate deploy
npx prisma generate
npm run typecheck
npm test
npm run judge:smoke
npm run ops:release-rehearsal
npx prisma validate
git diff --check
```

预期：

- 所有命令退出码为 0；
- `npm run judge:smoke` 显示五个 unit gate 全部 AC，并解锁 `lab1-batch`；
- `npm run ops:release-rehearsal` 显示 30 人演练快照，Docker 验证项为 `warn`；
- `git diff --check` 不出现空白错误；Windows LF/CRLF 提示不作为失败。

### Step 2：Linux Docker judge host smoke

必须在真实 Linux judge host 上执行：

```bash
npm run judge:docker-smoke
```

预期：

- 构建 `opencamp/unit-judge-rust:2026-summer`；
- 五个基础 unit gate 全部返回 Docker AC；
- `LabGateProgress` 只由 AC 推进；
- 五关后 `lab1-batch` 解锁；
- 临时学员被清理；
- 输出 `Docker unit OJ production smoke passed.`。

失败处理：

| 失败现象 | 优先检查 |
|---|---|
| `docker version` 失败 | Docker daemon、当前用户权限、host 是否为 Linux |
| 镜像构建失败 | `docker/unit-judge/Dockerfile`、网络/基础镜像缓存、Rust 工具链 |
| 大量 `SE` | Docker daemon、镜像标签、资源限制、只读文件系统、tmpfs |
| 某 gate 非 AC | 对照 `data/judges/unit/<gate>.json` 与 public log，确认题包和示例代码 |
| 临时数据残留 | 手动按脚本输出的 cohort/student 查库清理，再复跑 |

Step 2 通过后，后续 release archive/readiness 才允许使用 `--docker-verified`。

### Step 3：真实 30 人 cohort 快照归档

真实内测结束后，使用真实 cohortId 执行：

```bash
npm run ops:release-archive -- --cohortId=<真实 cohortId> --target=foundation_200 --docker-verified
```

如果 Step 2 尚未通过，不得加 `--docker-verified`。

预期：

- cohort 至少 30 人；否则命令拒绝真实归档；
- 生成 `docs/operations/release-reviews/<date>-<cohort>-foundation_200.md`；
- 生成 `docs/operations/release-reviews/<date>-<cohort>-foundation_200.json`；
- Markdown 中补充人工复核记录：
  - 教学负责人；
  - 运营负责人；
  - 技术负责人；
  - 是否放量；
  - warn 项解释；
  - 下周动作。

### Step 4：最终 readiness audit

归档后执行：

```bash
npm run ops:m5-readiness -- --cohortId=<真实 cohortId> --docker-verified --require-archive
```

预期：

- 输出 `READY_FOR_M6_PLANNING`；
- `fail=0`；
- 若有 `warn`，必须在 release review Markdown 的人工复核记录中解释。

若输出 `NOT_READY`，不进入 M6。按表格中的 fail 项处理后复跑。

## 3. 需要回填/保存的证据

| 证据 | 保存位置 |
|---|---|
| `npm run judge:docker-smoke` 完整终端输出 | 运维验收记录或附加到本交接单 |
| release archive Markdown | `docs/operations/release-reviews/` |
| release archive JSON | `docs/operations/release-reviews/` |
| `npm run ops:m5-readiness ...` 输出 | release review Markdown 或周会纪要 |
| 人工签字/豁免说明 | release review Markdown 的“人工复核记录” |

## 4. 不允许进入 M6 的情况

- 未在 Linux judge host 通过 `npm run judge:docker-smoke`；
- 真实 cohort 不足 30 人；
- 未归档 release review；
- readiness audit 仍有 fail；
- 出现错误 AC、越权、身份泄露或无法解释的队列/SE 异常；
- warn 项没有负责人解释与后续动作。

## 5. M6 启动条件

只有当以下命令在真实 cohort 上输出 `READY_FOR_M6_PLANNING`，才允许开始 M6 专业 integration OJ 规划：

```bash
npm run ops:m5-readiness -- --cohortId=<真实 cohortId> --docker-verified --require-archive
```

