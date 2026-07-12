# Rust 所有权系统

## 所有权规则

1. Rust 中每一个值都有一个**所有者**（owner）
2. 值在任一时刻有且仅有**一个**所有者
3. 当所有者离开作用域，这个值将被**丢弃**

## 移动语义

```rust
let s1 = String::from("hello");
let s2 = s1;  // s1 的所有权移动到 s2
// println!("{}", s1);  // 错误！s1 已失效
println!("{}", s2);     // 正确
```

## 克隆

```rust
let s1 = String::from("hello");
let s2 = s1.clone();  // 深拷贝
println!("{} {}", s1, s2);  // 都有效
```

## 引用与借用

### 不可变引用
```rust
let s = String::from("hello");
let r = &s;  // 不可变引用
println!("{}", r);
```

### 可变引用
```rust
let mut s = String::from("hello");
let r = &mut s;  // 可变引用
r.push_str(" world");
println!("{}", r);
```

### 借用规则
1. 在任意时刻，要么有**一个**可变引用，要么有**多个**不可变引用
2. 引用必须总是**有效**的

## Slice 类型

```rust
let s = String::from("hello world");
let hello = &s[0..5];  // "hello"
let world = &s[6..11]; // "world"
```
