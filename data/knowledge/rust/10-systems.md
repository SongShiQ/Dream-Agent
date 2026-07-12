# Rust 系统编程

## no_std 环境

```rust
#![no_std]
#![no_main]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

#[no_mangle]
pub extern "C" fn _start() -> ! {
    // 入口点
    loop {}
}
```

## unsafe Rust

### 裸指针

```rust
let mut num = 5;
let r1 = &num as *const i32;
let r2 = &mut num as *mut i32;

unsafe {
    println!("r1: {}", *r1);
    *r2 = 10;
    println!("r2: {}", *r2);
}
```

### unsafe 函数

```rust
unsafe fn dangerous() {
    // 危险操作
}

unsafe {
    dangerous();
}
```

### unsafe trait

```rust
unsafe trait Foo {
    fn dangerous_method(&self);
}

unsafe impl Foo for i32 {
    fn dangerous_method(&self) {
        println!("{}", self);
    }
}
```

## FFI (外部函数接口)

```rust
extern "C" {
    fn abs(input: i32) -> i32;
}

fn main() {
    unsafe {
        println!("Absolute value: {}", abs(-3));
    }
}
```

## 内联汇编

```rust
use std::arch::asm;

unsafe {
    let x: u64;
    asm!("mov {}, 42", out(reg) x);
    println!("x = {}", x);
}
```
