---
id: virtual-memory
tags: [memory, virtual_memory, page_fault]
stage: basic
labs: [lab2-address]
title: 虚拟内存与缺页
course_version: 2026-summer-os
publication_status: published
review_status: pending
source_refs: [rcore-tutorial-v3-ch4]
prerequisite_ids: [os-overview-interrupts]
misconception_ids: [va-is-pa, user-page-table-write]
question_tags: [virtual_memory, memory, page_fault]
lab_gate_ids: [lab2-address]
related_ids: [trap-syscall, process-fork]
---

# 虚拟内存与缺页

## 定义

虚拟内存让每个进程拥有独立的虚拟地址空间，由 **页表 + MMU** 翻译到物理地址，并提供隔离与换页能力。

## 要点

- VPN → PFN 映射在页表  
- TLB 缓存翻译结果  
- 缺页（page fault）：未映射或权限不符时陷入内核  
- 按需分页：访问时再装入  

## 常见误区

- 把虚拟地址当成物理地址调试  
- 认为用户态可随意改页表  

## 相关 lab

- lab2-address：地址空间、页表与用户态/内核态  
