---
id: inode
tags: [filesystem, inode]
stage: professional
labs: [lab4-filesystem]
title: inode 与目录项
---

# inode 与目录项

## 定义

inode 存文件 **元数据**（权限、大小、时间戳、数据块指针）。**文件名**在目录项中，指向 inode。

## 要点

- 硬链接：多目录项 → 同一 inode  
- 软链接：存路径字符串  
- VFS 统一不同文件系统接口  

## 常见误区

- 以为 inode 里存文件名  
- 混淆硬链接与复制文件  

## 相关 lab

- lab4-filesystem  
