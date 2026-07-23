---
id: rust-09-modules
title: Rust 模块与 Cargo
tags: [rust, modules, tooling, cargo, compiler_error, git]
stage: pre_study_tools
question_tags: [tooling, cargo, compiler_error]
---

# Rust 模块系统

## 模块定义

```rust
mod math {
    pub fn add(a: i32, b: i32) -> i32 {
        a + b
    }
    
    pub fn multiply(a: i32, b: i32) -> i32 {
        a * b
    }
}

fn main() {
    println!("{}", math::add(1, 2));
}
```

## 文件模块

```
src/
├── main.rs
├── math/
│   ├── mod.rs
│   ├── add.rs
│   └── multiply.rs
```

```rust
// main.rs
mod math;

fn main() {
    println!("{}", math::add(1, 2));
}
```

## use 关键字

```rust
use std::collections::HashMap;
use std::io::{self, Read, Write};
use crate::math::add;
```

## pub 可见性

```rust
mod outer {
    pub mod inner {
        pub fn public_fn() {}
        fn private_fn() {}
    }
    
    fn test() {
        inner::public_fn(); // 合法
        // inner::private_fn(); // 错误
    }
}
```

## Cargo.toml

```toml
[package]
name = "my-project"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
```

## 工具链自检

```bash
cargo check       # 快速检查语法、类型和借用错误，不生成最终可执行文件
cargo test        # 编译并运行项目测试
git status        # 确认当前分支以及已暂存、未暂存和未跟踪文件
git diff          # 检查工作区相对基线的实际修改
```

提交修改前，先用 `git status` 确认变更范围，再用 `git diff` 检查是否混入无关改动。依赖版本发生变化时，还要检查 `Cargo.toml` 与 `Cargo.lock` 是否一致。

## 编译错误定位

Rust 编译器同时报告多条错误时，后续错误可能只是第一条错误的连锁结果。建议按固定顺序排查：

1. 从输出顶部找到第一条主错误和源码位置。
2. 阅读错误代码、期望类型与实际类型，不先修改无关文件。
3. 对带错误编号的诊断运行 `rustc --explain E0xxx` 查看详细说明。
4. 修改最小范围后重新运行 `cargo check`，确认主错误是否消失。
5. 编译通过后再运行 `cargo test`，验证行为而不只验证语法。

链接阶段出现 `undefined reference` 时，优先检查声明与实现、crate 依赖、目标文件和链接输入是否一致。
