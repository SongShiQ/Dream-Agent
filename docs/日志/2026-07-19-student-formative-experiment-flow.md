# 学生参数化预实验流程工作日志

**日期**：2026-07-19  
**状态**：实现与真实页面验收完成

## 完成内容

- 新增 `ExperimentAttempt` Prisma 模型与迁移，保存题面/输入快照但不保存 expected。
- 新增学生实验服务层，集中处理发布过滤、单 active attempt、所有权、模板版本和服务端判分。
- 新增 `/api/experiments` 的 catalog/history、start 和 submit 流程。
- 在 `LabPanel` 增加与 OJ 完全分离的参数化预实验卡片。
- 当前 `vm-address-translation-v1` 保持 draft/pending，学生页只显示待教师审核，不为测试而发布。

## 安全回归

- 学生目录排除 draft/pending 和 published/pending 模板。
- 未发布模板启动返回 `template_unavailable`。
- 重复启动恢复同一进行中实例，并发启动受 `activeKey` 唯一键保护。
- 非所有者提交返回 403；已提交实例不能重复判分。
- 提交使用条件 `updateMany` 原子落库，并发重复请求只有一个能把状态从 `in_progress` 改为 `submitted`。
- 模板被撤回后不再返回历史题面，也拒绝继续提交；旧课程版本 attempt 同样被阻断。
- expected 由服务端模板版本与 variantIndex 重算；客户端自报 pass 不被采用。
- 响应始终是 `formative=true`、`masteryImpact=none`、`gatePassed=false`。

## 定向验收

- Prisma Client 生成成功，迁移 `20260719190000_add_experiment_attempts` 已应用。
- TypeScript 类型检查通过。
- 实验生成、审计和学生流程共 9 个定向测试通过。

## 真实页面验收

- 正式 draft/pending 状态在桌面与 390px 移动端均正确显示“1 个预实验正在教师审核中”。
- 临时加入 reviewed/published 验收模板，验证了目录展示、开始实例、正确答案提交、参考判定与“再做一题”。
- 首题为地址翻译变式，输入 `0xF5D462` 后服务端返回正确，并显示 `16110690 (0xf5d462)`。
- 第二次生成得到不同的题面和 variant，证明提交后 `activeKey` 清空且可继续练习。
- 浏览器控制台无 error/warn。
- 数据库核对时仅有两条临时 `ExperimentAttempt`；该学生 `CodeSubmission=0`，所有 Gate 均保持原来的 unlocked/locked 状态且没有 `bestVerdict`。
- 临时模板和两条验收 attempt 已删除，最终页面重新恢复为正式 draft/pending 状态。

## 未包含

- 未发布当前 draft 模板。
- 未实现 QEMU integration worker。
- 未把形成性作答写入 mastery、复习调度、CodeSubmission 或 LabGateProgress。

## 最终回归

- 全量 Vitest：34 个测试文件、139 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，`/api/experiments` 正确列为动态路由；已有动态 API 的 `DYNAMIC_SERVER_USAGE` 构建日志仍存在但退出码为 0。
- `npm run experiment:audit`：通过，当前正式模板仅有 pending review warning。
- `npm run experiment:audit -- --release`：按预期以 pending/not-published 两个 error 阻止发布。
- `npx prisma migrate status`：11 个迁移，数据库 schema 已是最新。
- `git diff --check`：无错误，仅有 Windows LF/CRLF 提示。
