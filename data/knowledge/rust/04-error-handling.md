---
id: rust-04-error-handling
title: Rust 错误处理
tags: [rust, result, error_handling]
stage: pre_study_rust
question_tags: [result]
---

# Rust 错误处理

## Result 枚举

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}

use std::fs::File;

fn read_file() -> Result<String, std::io::Error> {
    let content = std::fs::read_to_string("file.txt")?;
    Ok(content)
}
```

## ? 操作符

```rust
fn read_file() -> Result<String, std::io::Error> {
    let mut file = File::open("file.txt")?;
    let mut content = String::new();
    file.read_to_string(&mut content)?;
    Ok(content)
}
```

## panic! 宏

```rust
fn divide(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("除数不能为零");
    }
    a / b
}
```

## 自定义错误

```rust
#[derive(Debug)]
enum AppError {
    NotFound,
    Unauthorized,
    Internal(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            AppError::NotFound => write!(f, "未找到"),
            AppError::Unauthorized => write!(f, "未授权"),
            AppError::Internal(msg) => write!(f, "内部错误: {}", msg),
        }
    }
}
```
