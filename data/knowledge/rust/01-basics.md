---
id: rust-01-basics
title: Rust 基础语法
tags: [rust, variables]
stage: pre_study_rust
question_tags: [rust, variables]
---

# Rust 基础语法

## 变量与可变性

在 Rust 中，变量默认是不可变的。要使变量可变，需要使用 `mut` 关键字。

```rust
let x = 5;      // 不可变
let mut y = 10; // 可变
y = 15;         // 合法
```

## 数据类型

### 标量类型
- **整数**: `i8`, `i16`, `i32`, `i64`, `i128`, `isize`, `u8`, `u16`, `u32`, `u64`, `u128`, `usize`
- **浮点数**: `f32`, `f64`
- **布尔**: `bool` (`true`, `false`)
- **字符**: `char` (4字节 Unicode)

### 复合类型
- **元组**: `(i32, f64, bool)`
- **数组**: `[i32; 5]` (固定长度)

## 函数

```rust
fn add(x: i32, y: i32) -> i32 {
    x + y  // 没有分号表示返回值
}
```

## 控制流

### if 表达式
```rust
let x = 5;
if x > 0 {
    println!("正数");
} else if x < 0 {
    println!("负数");
} else {
    println!("零");
}
```

### 循环
```rust
// loop
loop {
    println!("无限循环");
    break;
}

// while
let mut x = 0;
while x < 10 {
    x += 1;
}

// for
for i in 0..10 {
    println!("{}", i);
}
```
