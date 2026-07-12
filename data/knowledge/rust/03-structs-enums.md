# Rust 结构体

## 定义结构体

```rust
struct User {
    username: String,
    email: String,
    sign_in_count: u64,
    active: bool,
}

let user = User {
    username: String::from("someone"),
    email: String::from("someone@example.com"),
    sign_in_count: 1,
    active: true,
};
```

## 方法

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    // 关联函数
    fn new(width: u32, height: u32) -> Self {
        Rectangle { width, height }
    }

    // 方法
    fn area(&self) -> u32 {
        self.width * self.height
    }

    // 可变方法
    fn scale(&mut self, factor: u32) {
        self.width *= factor;
        self.height *= factor;
    }
}
```

## 枚举

```rust
enum IpAddr {
    V4(u8, u8, u8, u8),
    V6(String),
}

let home = IpAddr::V4(127, 0, 0, 1);
let loopback = IpAddr::V6(String::from("::1"));
```

## Option 枚举

```rust
enum Option<T> {
    Some(T),
    None,
}

let some_number: Option<i32> = Some(5);
let absent: Option<i32> = None;
```

## 模式匹配

```rust
match some_number {
    Some(x) => println!("数字是: {}", x),
    None => println!("没有数字"),
}
```
