# Rust 并发编程

## 线程

```rust
use std::thread;

let handle = thread::spawn(|| {
    println!("子线程");
});

handle.join().unwrap();
```

## 消息传递

```rust
use std::sync::mpsc;

let (tx, rx) = mpsc::channel();

thread::spawn(move || {
    tx.send("hello").unwrap();
});

let received = rx.recv().unwrap();
println!("{}", received);
```

## 共享状态

```rust
use std::sync::{Arc, Mutex};
use std::thread;

let counter = Arc::new(Mutex::new(0));
let mut handles = vec![];

for _ in 0..10 {
    let counter = Arc::clone(&counter);
    let handle = thread::spawn(move || {
        let mut num = counter.lock().unwrap();
        *num += 1;
    });
    handles.push(handle);
}

for handle in handles {
    handle.join().unwrap();
}

println!("Result: {}", *counter.lock().unwrap());
```

## Send 和 Sync

- **Send**: 可以在线程间转移所有权
- **Sync**: 可以安全地被多个线程引用
