# Rust 泛型与 Trait

## 泛型函数

```rust
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}
```

## 泛型结构体

```rust
struct Point<T> {
    x: T,
    y: T,
}

let integer_point = Point { x: 5, y: 10 };
let float_point = Point { x: 1.0, y: 4.0 };
```

## Trait 定义

```rust
trait Summary {
    fn summarize(&self) -> String;
    
    // 默认实现
    fn preview(&self) -> String {
        format!("{}...", &self.summarize()[..20])
    }
}
```

## 实现 Trait

```rust
struct Article {
    title: String,
    content: String,
}

impl Summary for Article {
    fn summarize(&self) -> String {
        format!("{}: {}", self.title, self.content)
    }
}
```

## Trait 作为参数

```rust
fn notify(item: &impl Summary) {
    println!("新闻: {}", item.summarize());
}

// 等价于
fn notify<T: Summary>(item: &T) {
    println!("新闻: {}", item.summarize());
}
```

## 生命周期

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```
