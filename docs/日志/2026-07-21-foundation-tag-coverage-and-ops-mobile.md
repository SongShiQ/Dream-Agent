# Foundation 细标签收口与 `/ops` 移动端验收工作日志

**日期**：2026-07-21  
**状态**：已完成，未触碰教师审核和实验发布状态

## 本次目标

- 继续推进不依赖陈老师排版、内容审批或实验资源的导学/基础阶段工程工作。
- 消除 Foundation 覆盖摘要中的 `os_overview`、`variables`、`match` 三个细标签缺口。
- 验收 `/ops` 新增 Foundation 覆盖只读面板在 390×844 移动端的可读性和横向边界。
- 保持 release 模式对 23 张知识卡和 1 个实验模板的教师 blocker 诚实阻断。

## 实际修改

### 1. 题目知识点元数据

只修订已有题目的 `knowledgePoints`，不改题干、选项、答案、解析或题目难度：

- `data/questions/camp-00-theory.json`
  - OS 资源管理器题增加 `os_overview`。
  - 用户态与内核态分离题增加第二个 `os_overview` 映射。
- `data/questions/camp-01-rust.json`
  - Copy 赋值题增加 `variables`。
  - `match` 与 `if let` 对比题增加 `match`。
  - enum 状态题增加第二个 `match` 映射。
  - `Result<T, E>` 题增加第二个 `result` 映射。
- `data/questions/rust-rcore.json`
  - “值默认 move 后，原变量”题增加 `variables`。

这些标签来自题目本身的明确语义，不通过跨主题 fallback、降低题量门槛或新增未经审核的教学结论来消除缺口。

### 2. 覆盖测试

`tests/foundation/question-coverage.test.ts` 从“预期 Rust 基础存在两个未覆盖标签”改为：

- 所有 Foundation 单元 `uncoveredTags.length === 0`。
- 启用 alternate set 时，每个目标标签至少 2 题，`undercoveredTags.length === 0`。
- `os_overview`、`variables`、`match` 的题量都至少为 2。
- 增加合成失败用例：总题量达标但某标签只有 1 题时，产生 `insufficient_tag_coverage`。
- 原有双题组题量门槛和 coverage issue 断言保持不变。

## 数据同步与验证

### 幂等题目导入

```text
npm run content:import
```

结果：两次幂等同步共修正 7 道既有题的明确知识点元数据，0 道新增，数据库总题数 283。没有写入知识卡审核字段，也没有修改实验模板状态。

### 针对性验证

```text
npx vitest run tests/foundation/question-coverage.test.ts tests/content/release-check.test.ts tests/api/content-release.test.ts
```

结果：3 个测试文件、8 个测试通过。

### 发布检查

development：

- `decision=pass`
- 0 error、49 warning、0 blocker
- 6 个 Foundation 单元
- `foundationUncoveredTags=0`
- `foundationUndercoveredTags=0`

release：

- 仍为 `decision=fail`
- 48 blocker、1 warning
- `foundationUncoveredTags=0`
- `foundationUndercoveredTags=0`
- 0 个 Foundation coverage issue
- blocker 仍全部来自教师内容状态，不是本次标签修改造成

### 全量回归

```text
npm test
npm run typecheck
npm run build
```

结果：

- 42 个测试文件、173 个测试通过。
- TypeScript 类型检查通过。
- Next.js 生产构建通过，22 个页面/路由正常生成。
- production build 前停止开发服务，构建后已重新启动，当前地址为 `http://localhost:3000`。

## `/ops` 390×844 验收

- 使用本地 `dev-judge-token` 加载 `/ops`。
- 内容发布门禁面板显示 `FAIL`、48 blocker、1 warning、0 待处理决策、1 manifest。
- Foundation 覆盖显示 6 个单元、标签缺口 0、标签题量不足 0、每单元题量和难度区间。
- 页面 `document.scrollWidth=375`，viewport 宽度 390，无横向溢出。
- 题量、难度、实验模板状态和来源路径在窄屏下均能换行显示。
- 面板保持只读，没有新增批准、要求修改、发布或弃用操作。
- 浏览器会话已结束，未保留临时页面状态。

## 当前边界

- 标签覆盖为 0 只表示元数据能支持基本诊断，不表示教师已经确认题目教学质量。
- 当前每个目标标签已有至少 2 道题，但“2 道”只是 alternate set 的最低冗余门槛，后续仍应评估不同难度和错误类型是否充分。
- release 仍需教师处理 pending review、published pending 和实验模板 not_published；本次没有代审或发布。
- 当前工作树仍有大量既有未提交改动，本次未清理、回滚或提交这些改动。

## 下一步

1. 对已补齐标签的题目做题干、答案、解析和错误归因抽检。
2. 用 OS 总览与中断做首个导学/基础纵向主题包验收。
3. 保持真实 OS/QEMU 实验暂缓，继续优先做不依赖教师审批的导学和基础工程闭环。
