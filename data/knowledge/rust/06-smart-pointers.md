# Rust 智能指针

## Box<T>

```rust
let b = Box::new(5);
println!("b = {}", b);
```

## Rc<T> (引用计数)

```rust
use std::rc::Rc;

let a = Rc::new(5);
let b = Rc::clone(&a);
let c = Rc::clone(&a);

println!("引用计数: {}", Rc::strong_count(&a)); // 3
```

## RefCell<T> (内部可变性)

```rust
use std::cell::RefCell;

let data = RefCell::new(5);
*data.borrow_mut() += 1;
println!("{}", data.borrow()); // 6
```

## Arc<T> (原子引用计数)

```rust
use std::sync::Arc;
use std::thread;

let data = Arc::new(vec![1, 2, 3]);
let data_clone = Arc::clone(&data);

let handle = thread::spawn(move || {
    println!("{:?}", data_clone);
});

handle.join().unwrap();
```

## Mutex<T> (互斥锁)

```rust
use std::sync::Mutex;

let m = Mutex::new(5);
{
    let mut num = m.lock().unwrap();
    *num = 6;
}
println!("{:?}", m); // Mutex { data: 6 }
```
