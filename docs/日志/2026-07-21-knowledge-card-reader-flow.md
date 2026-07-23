# 主题学习地图知识卡阅读闭环日志

**日期**：2026-07-21  
**状态**：工程实现、全量回归、桌面与移动端浏览器验收通过  
**范围**：导学与基础阶段；不修改教师审核状态，不新增 mastery 来源，不启动真实 OS/QEMU 实验

## 本次目标

把“OS 总览与中断”主题学习地图中的稳定 `[K:id]` 从只读文字推进为学生可执行动作，形成：

```text
主题学习地图 / 失败诊断
  -> 打开补弱知识卡
  -> 阅读全文、来源和审核提示
  -> 返回原单元，或启动该单元 high-stakes 小测
```

阅读知识卡只提供学习材料，不写入掌握度、复习记录或答题证据。Foundation mastery 仍只接受原有服务端 high-stakes 小测。

## 实现内容

### 1. 稳定 ID 精确读取

- `lib/knowledge/cards.ts` 新增 `getKnowledgeCardById(id)`。
- 默认沿用学生可见规则，只读取 `publicationStatus=published` 的卡片。
- 空 ID、超长 ID 和不存在的 ID 返回 `null`。
- 教师/运营若需读取未发布内容，必须显式使用 `includeUnpublished`；学生 API 未启用该选项。

### 2. 学生知识卡 API

- `GET /api/knowledge?id=<stable-id>` 返回单张学生可见知识卡。
- 返回全文 Markdown、稳定 ID、审核状态、结构化来源和题目标签。
- 缺失或不可见卡片返回 404；无检索参数仍返回 400。
- 原有 tag、q、stage 和 stages 行为保持不变。

### 3. 学生阅读器

`components/FoundationUnitPanel.tsx` 中两类 `[K:id]` 均可直接打开：

- 主题学习地图中的补弱卡；
- 最近一次失败诊断中的推荐卡。

阅读弹层包含：

- 稳定 `[K:id]` 和卡片标题；
- 完整 Markdown 正文；
- `pending-review` 的明确提示；
- 结构化资料来源和可用外链；
- “返回学习地图”；
- “开始当前单元小测”。

弹层支持 Escape、遮罩关闭和显式关闭按钮。锁定单元的小测按钮保持禁用，服务端 `FOUNDATION_UNIT_LOCKED` 门禁也仍然有效。

### 4. 证据边界

- 打开、阅读或关闭知识卡不会创建 attempt。
- 阅读动作不会更新 `ReviewSchedule`。
- 阅读动作不会授予 `mastered`。
- 从阅读器启动小测仍调用原有 `/api/foundation` high-stakes 路径，提交后才可能形成 mastery 证据。
- 本次没有修改任何 `reviewer`、`reviewed_at`、`review_status` 或 `publication_status`。

## 自动化验证

新增 `tests/api/knowledge.test.ts`，覆盖：

- published 稳定 ID 返回 200 和全文；
- 缺失/不可见 ID 返回 404；
- 无参数请求保持 400。

更新 `tests/knowledge/cards.test.ts`，覆盖真实 `os-theory-01-overview` 精确读取，以及空 ID/不存在 ID 返回 `null`。

结果：

- 聚焦测试：3 个测试文件、13 个测试通过；
- 全量测试：44 个测试文件、181 个测试通过；
- `npm run typecheck`：通过；
- `npm run build`：通过，生成新的 `.next/BUILD_ID`；
- `git diff --check`：无 whitespace error，仅有 Windows CRLF 提示。

## 发布检查

- development：PASS，0 error、49 warning；
- release：按预期 FAIL，48 blocker、1 warning；
- Foundation 三类覆盖缺口仍均为 0；
- 主题包仍为 1 个、结构问题 0、`ready=true`。

48 个 release blocker 仍是教师内容状态事件，本切片没有绕过或修改。

## 浏览器验收

临时学生：`knowledge-card-reader-rehearsal`。

真实链路结果：

1. 在 OS 总览主题地图点击 `[K:os-theory-01-overview]`，弹层显示完整正文，包括“系统调用接口”。
2. 弹层显示待教师复核提示和 `Operating Systems: Three Easy Pieces` 来源。
3. 读卡前后单元状态均为 `missing`、`0/0`，证据文本均为“尚无微单元小测 attempt”。
4. 点击“返回学习地图”后弹层关闭，原单元上下文保留。
5. 再次打开并点击“开始 OS 总览与中断小测”，弹层关闭并生成 5 题、80% 达标线的小测。
6. 390×844 下 `document.scrollWidth=390`、`body.scrollWidth=390`，弹层面板宽 374px，左右边界均在视口内，底部两个动作持续可见。

临时数据清理：

- 删除前：student 1、in-progress foundation attempt 1、answer 0、review 0；
- 级联删除后：student 0、attempt 0、answer 0、review 0。

## 当前边界

- `pending-review` 卡片当前仍按既有 published 可见规则展示，并在阅读器中明确提示；是否收紧为 reviewed-only 仍需陈老师决定。
- 阅读器证明“能打开、能读、能返回、能启动小测”，不证明内容已经通过教师审核，也不证明真实学习效果。
- OS 总览的两张卡已接通；其他 Foundation 单元只有在主题包或诊断产生稳定卡引用时才出现同一入口。
- 真实 OS/QEMU Judge 继续暂缓。

## 下一步

继续处理不依赖陈老师审核和实验资源的工作：

1. 复用已验证的主题包契约，为“进程与调度”建立第二个纵向学习地图；
2. 先以真实题目标签、误区覆盖、补弱卡和课程前置关系做机器校验，不批量生成空内容；
3. 保持知识卡阅读不授予 mastery、high-stakes 小测才形成证据的边界；
4. 教师内容复核、发布口径和真实学生试点继续作为外部验收。
