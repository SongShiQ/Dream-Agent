---
id: ownership
tags: [rust, ownership, borrow]
stage: pre_study_rust
labs: []
title: Rust 所有权与借用
question_tags: [ownership, borrow]
---

# Rust 所有权与借用

## 定义

每个值有唯一所有者；离开作用域时释放。借用规则：多个共享引用 **或** 一个可变引用。

## 要点

- move 后原绑定失效（非 Copy）  
- `&T` / `&mut T` 不能同时存在  
- 生命周期帮助编译器验证引用有效期  

## 常见误区

- 把 `clone` 当默认解法而忽略借用  
- 同时持有可变与不可变引用  

## 相关练习

- 专项训练标签：`ownership`、`borrow`  
