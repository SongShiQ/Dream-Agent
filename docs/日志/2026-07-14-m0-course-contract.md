# 工作日志 · M0 课程与生产前提契约

**日期**：2026-07-14  
**任务**：根据已复核的倒金字塔训练营方案，推进下一步 M0，冻结进入 M1/M4 前需要确认的身份、数据库、判题环境、课程版本、权限和灰度规则。

## 完成内容

- 新增 `docs/adr/2026-07-14-auth-db.md`，记录身份、权限、session-derived student、PostgreSQL 与证据状态的生产前提。
- 新增 `docs/adr/2026-07-14-judge-runtime.md`，记录 Web 不运行学员代码、Linux Docker worker、PENDING→verdict 状态机和 AC-only passed 规则。
- 新增 `docs/operations/2026-07-14-m0-course-ops-contract.md`，固化文档优先级、四类角色权限、cohort 默认节奏、项目候选公开文案、灰度节奏和 M0 签字项。
- 新增课程版本目录 `data/curriculum/2026-summer-os/`：
  - `curriculum.json`：容量预算、四阶段、晋级证据和文档入口；
  - `foundation-units.json`：六个导学微单元；
  - `required-gates.json`：五个基础 unit gate、专业 integration gate 和项目 manual gate 契约。
- 更新 `data/CONTENT_PACK.md`，补充 curriculum 目录和课程版本说明。

## 关键决策

- 现阶段不修改现有 `data/labs/gates.json` 的 gate id；课程契约通过 `targetId + currentAliases` 兼容现有草案，后续 M1/M4 再统一命名。
- M0 文档采用“推荐默认 + 待确认”口径，不把教学/运维尚未签字的事项写成已拍板。
- 继续坚持 OJ AC 是基础/专业 gate passed 的唯一自动证据，项目最终评价保留给老师。

## 验证

- 使用 PowerShell `ConvertFrom-Json` 验证三份 curriculum JSON 均可解析。
- 运行 `git diff --check`，未发现格式错误；输出中的 LF/CRLF 提示来自既有工作区文件。
- 本轮仅新增/更新文档与内容契约，未修改运行时代码。

## 下一步

1. 若 M0 默认值可接受，进入 M1-A：审阅当前 Prisma schema 与未提交 OJ 改动，生成独立 migration。
2. M1-A 前需要谨慎处理现有 dirty worktree，避免覆盖已有实现改动。
3. 若需要先让教学负责人确认，可先审阅 M0 签字项，再进入 migration。
