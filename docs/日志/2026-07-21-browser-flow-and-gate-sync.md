# 导学浏览器纵向验收与关卡并发初始化修复日志

**日期**：2026-07-21  
**状态**：浏览器验收完成；发现并修复 2 个策略/UI 问题和 1 个后端并发问题

## 本次目标

- 在真实桌面和 390×844 移动端验证“Foundation 小测失败 -> 诊断 -> 知识卡 -> 复习 -> 主任务”连续性。
- 检查刷新后诊断恢复、到期复习是否走 practice、取消复习是否清理临时提示。
- 观察新学员首屏并行加载是否存在关卡进度初始化竞态。
- 保持测试数据可回收，不触碰已有学员和教师审核内容。

## 浏览器发现与修复

### 1. 空 weakPoints 的主任务错误

测试学员 OS 总览小测失败后，页面诊断和复习都指向 OS，但“唯一主任务”显示 Rust 基础。原因是空的 Assessment weakPoints 被 `weakPointsToRecommendedUnit([])` 默认映射为 `rust-basics`，覆盖了 Foundation `in_progress` 优先级。

修复：

- 新增 `resolveRecommendedFoundationUnitId`。
- 只有存在真实 weakPoints 时才生成推荐单元；空数组返回 `null`。
- 无证据推荐时，`selectActionableFoundationUnit` 会优先选择已有 `in_progress` 的单元。
- 新增条件：Foundation 小测记录会让“导学诊断/小测证据”显示 `已浏览/有记录`，但失败不会显示已达标。

浏览器复验：主任务由“完成微单元：Rust 基础”改为“完成微单元：OS 总览与中断”；推荐导学微单元同步为 OS 总览。

### 2. 取消复习残留提示

点击“到期复习”后启动的是 practice，页面正确显示“只更新复习调度，不替代 mastered”。但点击“先不提交”后旧提示仍然保留，且最近失败诊断不会立即恢复。

修复 `FoundationUnitPanel`：取消时清空 active attempt、题目、答案和启动提示，并重新加载 Foundation Dashboard。

浏览器复验：取消后“到期复习已开始”消失，上一条“本次未达标”、薄弱点和 `[K:trap-syscall]` 立即恢复；未生成新的已提交 attempt。

### 3. 移动端标题栏换行

390×844 截图发现右上角“设置/退出登录”因按钮可收缩而逐字竖排。

修复 `app/page.tsx`：标题栏允许换行，操作区在小屏占满一行并右对齐，按钮增加 `shrink-0 whitespace-nowrap`。

移动端复验：标题栏按钮保持正常词组显示，页面 `scrollWidth=390` 与 viewport 一致，没有横向溢出；诊断区域、知识卡和单元卡纵向排列无遮挡。

## 关卡进度并发修复

开发服务日志暴露：首屏并行请求 `/api/labs` 时，`syncStudentGateProgress` 原先采用“查询后逐个 create”，两个请求可能同时创建同一 `(studentId, gateId)`，触发 Prisma P2002 并返回 500。

修改 `lib/labs/gates.ts`：

- 用复合唯一键 `studentId_gateId` 的 `upsert` 在事务中确保每个 gate 只初始化一行。
- 状态刷新改用 `updateMany` 并限定 `status != passed`，避免与 Judge AC 并发时把 passed 降回 unlocked/locked。
- 新增 `tests/labs/gates-concurrency.test.ts`，三次并发同步后验证行数和根关卡状态。

## 自动化和真实 HTTP 验证

- 全量 Vitest：42 个测试文件、172 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，22 个页面/路由正常生成。
- 真实 HTTP 并发：同一新学员同时请求 `/api/labs` 5 次，状态码 `[200, 200, 200, 200, 200]`，每次返回完整 gate 列表，数据库最终 11 个唯一进度行。
- 临时 HTTP 学员已删除，测试前后无残留。
- 浏览器桌面端、390×844 移动端：主任务、诊断恢复、复习启动/取消和无横向溢出均通过。
- 本地浏览器控制台未发现应用自身 warning/error；受限网络下出现过一次 Statsig 第三方 telemetry 超时，不影响本地 API 或页面功能，未修改外部遥测配置。

## 当前边界

- 浏览器验收使用专用本地测试学员，不代表真实学生效果评估。
- 真实教师内容 blocker、OpenKB manifest 和题目 uncovered tags 没有被自动处理。
- 关卡进度初始化现在并发安全，但正式 Judge worker 的跨进程资源隔离仍属于后续实验阶段。

## 下一步

- 将 `details.foundationCoverage` 接入 `/ops` 的只读工程信息区，显示题量、标签缺口和难度分布。
- 补齐 `os_overview`、`variables`、`match` 的题目细标时，继续保持覆盖审计和 alternate set 门槛。
- 在真实课程内容批次到位后，再进行教师审核和 release blocker 清理；当前不自行代审。

