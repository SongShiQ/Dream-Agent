# Wiki 引用与 Mastery 纵向切片工作日志

**日期**：2026-07-19  
**范围**：虚拟内存 / 地址空间样板  
**状态**：本轮完成，已通过代码、接口和浏览器验收

## 背景与问题

已有系统具备题库、导学微单元、Lab Gate、Judge 和学习地图，但 Tutor 检索依据不可见，知识卡片缺少来源/发布/复核契约，Dashboard 也不能保证推荐的下一步一定可执行。

## 实施内容

- 为知识卡片增加课程版本、发布状态、教师复核状态、来源引用、先修点、误区、题目标签、Lab Gate 和相关卡片关系。
- 学生默认只检索 `published` 条目；Wiki 正文在 Prompt 中按不可信数据处理，并使用稳定 `[K:<id>]` 标识。
- 为 `ChatMessage` 增加 `knowledgeRefs` JSON 字段，保存精简引用摘要；历史会话和流式响应分别通过数据库与 `X-Knowledge-Refs` 返回。
- Dashboard 的 primary task 改为先选已解锁且未完成的必修 Foundation 单元；主任务“开始”会自动进入对应高 stakes 小测。
- 保留正式证据边界：问答和引用不改变 mastery，Foundation 只接受服务端小测，Lab Gate 只接受 Judge AC/既有受保护证据。

## 验证记录

- `npx prisma generate`：通过。
- `npx prisma migrate deploy`、`npx prisma migrate status`：通过，数据库已应用 `20260719090000_add_chat_knowledge_refs`。
- 定向测试：10/10 通过；全量测试：26 个文件、107 个测试全部通过。
- `npm run typecheck`：通过。
- `npm run build`：通过；仅有既有动态 API 的 Next.js 日志，退出码为 0。
- 浏览器登录 `Tsinghua`：成功进入学习地图；真实点击“开始”后自动打开 `Rust 基础`高 stakes 小测，页面明确显示“提交后会成为导学微单元达标证据”。
- `GET /api/knowledge?q=虚拟内存`：返回 `virtual-memory`、`published/pending`、`rcore-tutorial-v3-ch4`、`2026-summer-os` 和 `lab2-address`。

## 审核结论与限制

- 通过：学生主任务可执行、引用可追溯、发布过滤生效、正式 mastery 不被 LLM/Wiki 讲解越权写入。
- 本轮未配置外部 LLM，因此未发送真实聊天流；聊天引用的 Header/数据库契约由单元测试、类型检查和代码审核覆盖。
- 本轮未接入 OpenKB 在线运行时、教师审核面板或 QEMU 专业 Judge；这些属于后续纵向切片，不应在汇报中表述为已完成。
