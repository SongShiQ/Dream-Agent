# 工作日志：Foundation 题目质量门禁与运营页验收

**日期**：2026-07-23  
**范围**：导学与基础阶段的题目质量审计、内容发布门禁、教师运营页浏览器验收

## 本次完成

- 新增 Foundation 题目质量审计：按当前 Foundation 阶段过滤题目，规范化题干后检查重复题、选择题结构错误和解析过短。
- 将题目质量审计接入 `content:release-check`：development 模式报告 warning，release 模式升级为 error；题目数量、标签覆盖和题目质量分别统计，不把题量达标等同于教学质量达标。
- 在 `/ops` 的“内容发布门禁”中增加“Foundation 题目质量抽检”摘要，显示有效题目、重复题干、结构错误、解析过短四项指标。
- 新增单元测试覆盖：重复题干、错误选项、错误答案、短解析、有效题目和非 Foundation 阶段过滤。

## 工程验证

- `npm run typecheck`：通过。
- `npm test -- --run`：45 个测试文件、184 项测试全部通过。
- `npm run build`：通过。
- `npm run content:release-check -- --mode development`：通过；无 blocker，49 个 warning 保留为待教师审核提示。
- development 摘要：23 张知识卡、1 个实验模板、3 个 Foundation 主题包、162 个有效题目；重复题干 0、结构错误 0、解析过短 0、主题包结构问题 0、标签缺口 0。

## 浏览器验收

- 本地地址：`http://localhost:3000/ops`。
- 使用开发环境只读 token `dev-judge-token` 加载成功，页面无运行时错误。
- 运营页显示 23 条课程知识审核记录、3 个 Foundation 主题包，并正确显示“内存与虚存 → Rust 基础”的下一任务关系；三个主题包均为 `READY`。
- 页面以 `release` 模式展示正式发布门禁：当前为 `FAIL`，其中 48 个 blocker 主要来自知识卡/实验模板尚未教师审核，另有 1 个 warning；这与“公共课程知识必须先经过教师审核”的规则一致，不代表题目质量审计失败。
- 题目质量摘要在页面显示为：有效题目 162、重复题干 0、结构错误 0、解析过短 0。
- 学生端此前已验收 OS 总览、中断、进程调度和内存虚存主题地图；内存虚存仍按前置关系锁定，阅读知识卡不会直接获得 mastery。

## 当前未完成与边界

- 49 个 development warning 尚未完成教师逐条审核；本轮不自动修改审核状态。
- 真实 OS/QEMU 实验和受保护 Judge 暂缓，当前仅保留实验模板与发布接口，不把模板误称为真实实验完成。
- 浏览器验收证明页面和数据链路可用，不等同于真实学生学习效果已经证明。

## Git 状态

- 质量测试、运营页摘要和本日志已提交到 `main`：`62972ff test: add foundation question quality gate`。
- 文档导航已更新：`a63fe42 docs: link latest foundation quality log`。
- `git push origin main` 已重试，但本机 Git Credential Manager 返回 `SEC_E_NO_CREDENTIALS`；本地提交完整保留，待恢复 GitHub 登录后推送。
