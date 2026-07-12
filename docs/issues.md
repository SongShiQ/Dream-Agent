# 项目问题清单

**创建时间**: 2026-07-11 16:10  
**最后更新**: 2026-07-12（Learning Loop MVP）

---

## 已关闭

| 原问题 | 状态 | 说明 |
|--------|------|------|
| 按钮无功能 | 已关 | 模式切换 + 各面板交互 |
| 无用户系统 | 已关 | POST `/api/student` upsert，DB id |
| 无状态管理 | 已关 | AppContext + isReady hydration |
| API 路由不完整 | 已关 | assess/plan/exam/chat/student |
| 数据库未实际使用 | 已关 | 学员/答题/评估/计划写入 Prisma |
| 前端卡死 | 已关 | setMessageHandler 用 ref |
| Hydration 错误 | 已关 | 挂载后再读 localStorage |
| 练习假判题 | 已关 | 规则 grade + 题库优先 |
| assess/plan 仅欢迎语 | 已关 | AssessPanel / PlanPanel |
| Settings 未挂载 | 已关 | 顶栏设置 + feedbackMode 同步 |

---

## 仍开放（非阻塞）

### 1. 会话聊天历史未持久化到 DB（中）
**已关（M5）**：ChatSession/ChatMessage；刷新可恢复；新会话按钮。

### 2. 知识库仍为关键词检索（低）
未上向量 RAG（按计划非目标，见 M6 知识卡片）。

### 3. 设置中 API Key 未驱动服务端 LLM（低）
**已关（M7）**：聊天请求携带 `llmConfig`；仍回退 `.env.local`。

### 4. 代码判题沙箱（低）
Docker/Judge 未做；**M7 提供静态分析反馈**（`LabPanel` + `/api/submit`）。

---

## 修复优先级（历史）

P0 身份/练习/进度 — **已完成**  
P1 聊天上下文 / 模式语义 — **已完成**  
P1.5 题库/定向/错题 — **已完成（M4）**  
P1.5 聊天落库 — **已完成（M5）**  
P2 RAG / 沙箱 — 后续

---

*最后更新: 2026-07-12*
