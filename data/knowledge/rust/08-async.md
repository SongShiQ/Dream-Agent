# Rust 异步编程

## async/await

```rust
async fn fetch_data() -> String {
    // 异步操作
    "data".to_string()
}

#[tokio::main]
async fn main() {
    let data = fetch_data().await;
    println!("{}", data);
}
```

## Future Trait

```rust
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

struct MyFuture;

impl Future for MyFuture {
    type Output = i32;

    fn poll(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Self::Output> {
        Poll::Ready(42)
    }
}
```

## 异步函数

```rust
async fn process() -> Result<(), Box<dyn std::error::Error>> {
    let data = fetch_data().await?;
    let result = transform(data).await?;
    save(result).await?;
    Ok(())
}
```

## select! 宏

```rust
use tokio::select;

async fn example() {
    select! {
        result = fetch_a() => println!("A完成: {}", result),
        result = fetch_b() => println!("B完成: {}", result),
    }
}
```
