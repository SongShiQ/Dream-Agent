# 工作日志：M5 运营 Dashboard

**日期**：2026-07-14  
**任务**：继续 M5，把 Judge metrics 与风险队列接入一个只读运营页面，方便灰度期间直接观察系统与学生风险。

## 完成内容

1. 新增运营页面
   - 新增 `app/ops/page.tsx`。
   - 页面要求输入 `x-judge-token`。
   - token 保存到 `sessionStorage`，仅用于本浏览器会话快速刷新。

2. 接入只读数据
   - 拉取 `GET /api/judge/health`：
     - job 总数；
     - queued/running；
     - queue p50/p95；
     - SE retry；
     - expired lease；
     - run p95；
     - verdict 分布；
     - job 状态分布。
   - 拉取 `GET /api/ops/risk`：
     - 风险总数；
     - high/medium/low 分布；
     - 风险明细；
     - evidence；
     - nextAction。

3. 页面结构
   - 顶部 token 输入与刷新。
   - 四张系统指标卡。
   - verdict 分布与 job 状态。
   - 风险队列列表。

## 安全边界

- 页面本身不写任何运营状态。
- 数据 API 已由 `x-judge-token` 保护。
- 当前是灰度观察面板，不是完整 TA 工单系统。

## 验证

- `npm run typecheck`：通过。
- `npm test`：通过，23 个测试文件 / 95 个测试。
- `npm run judge:smoke`：通过，五个 unit gate AC 后 lab1 解锁。
- `npx prisma validate`：通过。
- `git diff --check`：通过；仅出现现有 LF/CRLF 提示，无 whitespace error。

## 后续

1. 增加风险处理状态：
   - open；
   - acknowledged；
   - resolved；
   - ignored。
2. 接入 cohort 过滤。
3. 增加趋势图与导出，用于每周复盘。
