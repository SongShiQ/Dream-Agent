---
id: process-fork
tags: [process, fork, state]
stage: professional
labs: [lab3-process]
title: fork 与进程创建
---

# fork 与进程创建

## 定义

`fork` 创建当前进程的子进程副本。子进程获得独立地址空间（常配合写时复制 COW），父子从 `fork` 返回处继续执行。

## 要点

- 父进程返回值：子进程 PID  
- 子进程返回值：`0`  
- 失败：`-1`  
- 现代 OS 多用 **COW** 延迟物理页复制  

## 常见误区

- 以为父子共享同一页表且写共享（实际写时才复制）  
- 混淆 `fork` 与线程创建  

## 相关 lab

- lab3-process：进程创建、切换与系统调用路径  
