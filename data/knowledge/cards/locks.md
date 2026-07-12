---
id: locks
tags: [concurrency, lock, spinlock, deadlock]
stage: professional
labs: [lab5-concurrency]
title: 锁与死锁
---

# 锁与死锁

## 定义

锁保护临界区，防止数据竞争。自旋锁忙等；互斥锁争用时可阻塞。

## 要点

- 临界区尽量短  
- 死锁四条件：互斥、占有且等待、不可抢占、循环等待  
- 有序加锁可破坏循环等待  

## 常见误区

- 长临界区用自旋锁  
- 多核上仅关中断就以为解决了竞争  

## 相关 lab

- lab5-concurrency  
