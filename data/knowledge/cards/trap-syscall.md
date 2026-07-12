---
id: trap-syscall
tags: [trap, syscall, interrupt]
stage: basic
labs: [lab1-batch]
title: 陷入与系统调用
---

# 陷入与系统调用

## 定义

系统调用通过 **trap/syscall** 从用户态进入内核，完成特权操作后返回用户态。

## 要点

- 切换特权级，不是普通函数调用  
- 时钟中断提供分时调度时机  
- 统一 trap 入口处理中断/异常/系统调用（如 xv6/rCore 思路）  

## 常见误区

- 用户态直接跳转内核地址  
- 把中断处理当成普通业务逻辑随意睡眠（需看上下文）  

## 相关 lab

- lab1-batch：批处理与基础 trap  
