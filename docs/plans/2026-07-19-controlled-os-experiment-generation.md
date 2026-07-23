# 受控 OS 实验生成框架方案

**日期**：2026-07-19  
**状态**：首个虚拟内存样板已实现，QEMU integration Judge 待后续  
**主题**：虚拟地址翻译与页表权限

## 目标

将“AI 自动生成实验”约束为教师批准模板上的确定性参数变体，而不是让模型自由生成整仓实验、参考答案和判题脚本。

## 信任边界

- 模板、来源、Gate 关系和隐藏覆盖进入 Git 审核。
- 学生实例不包含 expected；教师模式才输出参考答案。
- 预实验固定 `masteryImpact=none`，答对不能写 `LabGateProgress.passed`。
- 专业 Gate 仍只有真实 integration/QEMU Judge 的 AC 才能通过；当前模板不会冒充 QEMU 已上线。
- 网络策略固定 `none`，资源上限写入模板但只有未来 integration worker 执行时才真正强制。

## 样板

`vm-address-translation-v1` 生成四类地址转换任务：

1. 合法映射，计算 `PFN * pageSize + offset`；
2. present=0；
3. 用户态访问 user=0；
4. 写入 writable=0。

模板提供 64 个稳定变体和 8 个隐藏审计样例。同一 learner/sequence 始终得到同一实例，不同序列可得到不同实例。

## 发布门禁

- Zod schema；
- 来源 ID 与 Lab Gate 必须存在；
- 页大小必须是 2 的幂；
- 隐藏样例必须覆盖四类场景且输入不重复；
- reviewed 模板必须有复核人/时间；
- `--release` 要求 `publicationStatus=published` 且无 error。

## 后续

1. 学生 formative attempt 持久化与独立 API/UI 已实现，且不影响正式 mastery。
2. 加入基准解仓库、QEMU 启动脚本、隐藏测试签名和 integration worker。
3. 扩展到 fork/COW、调度、inode 路径和并发死锁实验模板。
