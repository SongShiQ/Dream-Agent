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
