# 受控 OS 实验生成工作日志

**日期**：2026-07-19  
**状态**：核心生成器、CLI 与发布审计已实现并完成验收

## 完成内容

- 新增实验模板 Zod schema、注册表、地址转换生成器、确定性判分和发布审计。
- 新增 `experiment:generate` 与 `experiment:audit` CLI。
- 新增 `vm-address-translation-v1` draft/pending 样板，关联 `rcore-tutorial-v3-ch4` 与 `lab2-address`。
- 学生输出不含 expected，教师输出可用于基准解检查；`masteryImpact` 强制为 `none`。

## 当前边界

当前仍没有 QEMU integration worker，因此只能称为“可生成、可判分的预实验”，不能称为专业 Lab AC Judge。

## 验收结果

- 全量测试包含确定性变体、四场景覆盖、十六/十进制答案、故障码和 release gate。
- `experiment:audit`：draft/pending 返回 warning，退出码 0。
- `experiment:audit -- --release`：以 pending/not-published 两个 error 阻断，退出码 1。
- `experiment:generate`：学生输出不含 expected；同一参数的 `--teacher` 输出同一实例并包含参考答案。
- 任一模板 JSON/schema 损坏时，注册表不再静默跳过，而是使整个审计失败。
