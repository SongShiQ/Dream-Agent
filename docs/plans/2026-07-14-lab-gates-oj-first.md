# 计划：严肃训练营 OJ 化 + 关卡进度 DB

**日期**: 2026-07-14  
**状态**: Phase A **骨架已出现但未达交付验收**（缺 Prisma migration、可信身份、异步 JudgeJob/JudgeRun 与跨端个人进度）；Phase B/C 待做  
**取代/升级**: `2026-07-14-lab-gates-ide-first.md` 中「自报过关 / 清单自觉」的软过关表述  

### Phase A 交付口径（2026-07-14 复核）

已出现但仍需验收的骨架：

- [x] Prisma schema 中已有 `LabGateProgress` 与 `CodeSubmission` verdict/gateId/judgeKind 相关改动  
- [x] `data/labs/gates.json`  
- [x] `lib/labs/*` 加载与 `markGatePassedOnAc`（仅 AC）  
- [x] `GET/POST /api/labs`  
- [x] submit 已禁止客户端自报 `isPassed` 直接过关，当前 verdict 仍为 `STATIC`  
- [x] LabPanel 关卡列表 + ide_first 分流  

Phase A 仍缺的交付项：

- [ ] 独立 Prisma migration，并在空库和当前开发库验证  
- [ ] 从 session 推导 student，而不是信任客户端传入 `studentId`  
- [ ] `JudgeJob` / `JudgeRun` 或等价状态机，提交默认为 `PENDING`  
- [ ] 受保护的 judge complete 通道，只有 `AC` 才能原子写入 passed  
- [ ] 服务端 `DailyTaskProgress`，区分 `personal_done` 与 `mastered`  
- [ ] Phase B：unit_oj 真跑 cargo test  
- [ ] Phase C：integration_oj  

---

## 0. 产品定位（已拍板方向）

| 原则 | 含义 |
|------|------|
| **严肃训练营 ≈ OJ 纪律** | 过关看**自动评测结果**，不是勾选清单或静态分 100 |
| **基础 rustlings = 小型 OJ** | 单文件/小练习，`cargo test` / rustc 判对错 |
| **专业 lab = 大型 OJ（IDE 提交）** | 多文件在 VS Code 改；提交后由**评测后端**跑官方/课程测试 |
| **进度必须上 DB** | 与 Student 绑定，可审计、可报告、可多端 |
| **网页** | 导学测评 + 关卡状态 + 提交入口/结果展示；**不是**专业阶段主编辑器 |

### 与「半自由探索」的关系

- **编码过程**可以半自由（在 IDE 里试错、查文档）。  
- **过关标准**必须刚性：测试绿了才算过，和探索不矛盾。  
- 助教：卡点讲解、概念题、错因分析；**不替代判题机**。

---

## 1. 现状（必须诚实）

| 组件 | 现状 | 距 OJ |
|------|------|--------|
| LabPanel | 粘贴代码 + **静态分析** | 不是 OJ |
| `/api/submit` | 存库 + 启发式分数；当前已阻断自报 passed | 仍是 `STATIC`，尚未进入 PENDING→AC/WA 状态机 |
| CLI submit | 同上 | 无沙箱 |
| Docker / QEMU / Piston | **未做**（路线图刻意未做） | 专业 lab 真判的核心缺口 |
| rustlings 集成 | **无** | 基础 OJ 需新建 |
| 进度 DB | schema 已有 Lab 关卡进度骨架，但缺 migration 与生产验证 | 需补齐迁移、鉴权、状态机与跨端个人进度 |

**结论**：可以立刻把**产品规则与数据模型**改成 OJ 心态；**真跑测**要分两级落地——基础（易）与专业（难）。

---

## 2. 四级 OJ 模型

### 2.1 关卡类型

```ts
type GateJudgeKind =
  | 'none'           // 导学：无代码关
  | 'unit_oj'        // 基础：单文件/小 crate，跑单元测试（rustlings 类）
  | 'integration_oj' // 专业：仓库级，跑 lab 测试脚本 / make test / qemu 测例
  | 'manual_teacher' // 项目：老师评（助教不自动通关）
```

### 2.2 一次提交的权威结果

```ts
type JudgeVerdict = 'AC' | 'WA' | 'CE' | 'RE' | 'TLE' | 'SE' | 'PENDING'

// SE = system error（沙箱挂了）
```

**过关**：该 `gateId` 存在至少一条 `verdict === 'AC'`（可配置「最近一次」或「历史任意 AC」；默认 **历史任意 AC 即解锁**，避免反复刷）。

### 2.3 DB（进度上数据库 — 已定）

```prisma
model LabGateProgress {
  id           String   @id @default(cuid())
  studentId    String
  gateId       String   // env-setup | rustlings-xx | lab1-batch | lab2-address ...
  status       String   // locked | unlocked | passed
  passedAt     DateTime?
  bestVerdict  String?  // AC/...
  passSubmitId String?  // 对应 AC 的提交
  updatedAt    DateTime @updatedAt
  student      Student  @relation(...)

  @@unique([studentId, gateId])
  @@index([studentId, status])
}

// CodeSubmission 扩展（或 JudgeRun 新表）
// + gateId
// + verdict
// + judgeLog (截断)
// + judgeKind
// isPassed 仅当 verdict==AC 时为 true（禁止纯自报）
```

关卡**定义**仍在内容包：`data/labs/gates.json`（可版本化、老师可改）。

---

## 3. 两级判题架构（怎么处理才合适）

### 3.1 基础：`unit_oj`（rustlings 类）— 优先实现

**本质**：和小型 OJ 一样——交一份源码，服务器跑测试。

```text
学员（网页粘贴 或 CLI 交单文件）
  → API 创建 JudgeJob
  → Worker：隔离目录 + timeout + 无网络
       cargo test / rustc --test
  → 写回 verdict + log
  → 若 AC → LabGateProgress.passed
```

**推荐技术路径（由易到难）：**

| 方案 | 说明 | 适用 |
|------|------|------|
| A. 本机/单机 worker + 进程隔离 | `timeout`、临时目录、禁用网络、资源限制 | 创业内测、小人数 |
| B. Docker 一提交一容器 | 更安全、可复制 | **小流量正式营推荐** |
| C. 外部判题（Piston/自建） | 少维护 | 仅 unit 级、语言标准 |

**rustlings 集成方式：**

- 内容包声明：`repo` 模板或内置 exercises 路径 + `test_cmd`  
- 或：平台维护「单题 crate 模板」，每题一个 `main.rs`/`lib.rs` + `tests/`  
- **不要**让学员在网页改 rustlings 整仓；可「下载题包 / clone 模板 + CLI 提交单文件」

**基础硬关建议（OJ 版）：**

1. `env-setup` — 特殊：检测工具链（`rustc -V`）或交「环境自检脚本输出」；若难自动化可暂 `checklist+命令验证`  
2. `rustlings-set` 或拆成多题 gate（variables、move_semantics…）— **每题 unit_oj**  
3. `lab1-batch` — 若测试可脚本化则 `integration_oj` 简化版；否则先 unit 化关键测例  

数量：**按课表**；产品上按「N 个 AC 关卡」计，不是假清单。

### 3.2 专业：`integration_oj` — 严肃但分阶段

**编码**：必须在 IDE（VS Code）本地仓库改。  
**提交**：CLI `dream-agent submit --gate lab2-address`（打包 diff / 指定文件 / 整个 student workspace 快照——需定协议）。  
**评测**：服务器侧跑课程官方测试（如 `make test` / 课程提供的测例 / QEMU）。

```text
VS Code 本地 rCore 树
  → CLI 打包提交（git diff 或 lab 目录）
  → 评测机：checkout 基准 + 应用补丁 + 跑测试
  → AC/WA + 日志回网页
  → AC 则该 lab gate passed
```

**难点（必须正视）：**

| 难点 | 处理 |
|------|------|
| 多文件、依赖工具链 | 预置 Docker 镜像（riscv-gnu、qemu） |
| 评测时长、队列 | PENDING 状态 + 异步 worker |
| 安全（任意代码） | 容器、无网、CPU/内存/时间限制、非 root |
| 测例与课表版本 | 内容包锁定 `image` + `test_script` 版本 |
| 作弊/抄袭 | 后期再做；先保证真跑测 |

**分阶段交付专业 OJ：**

| 子阶段 | 能力 | 是否算「严肃 OJ」 |
|--------|------|-------------------|
| P-OJ-1 | 提交队列 + 容器内跑**课程脚本**，有 AC/WA | 是（最小真 OJ） |
| P-OJ-2 | QEMU 全量 lab 测例、多测例分项 | 是（完整） |
| P-OJ-0（过渡，尽量短） | 仅静态分析 | **否**，不得标「已过关」 |

用户已否决「长期靠自报过关」→ 专业关 **`status=passed` 仅能由 verdict=AC 写入**。

### 3.3 项目

- `judgeKind: manual_teacher`  
- 助教主路径：全部 `unit_oj` + `integration_oj` 关卡 AC 后 → `assistantPathCompletedAt`  
- 项目分与答辩：老师，系统不自动 AC 项目最终分  

---

## 4. 网页 / IDE 分工（OJ 版）

| | 导学 | 基础 unit_oj | 专业 integration_oj |
|--|------|----------------|---------------------|
| 写代码 | — | 网页小编或 IDE | **仅 IDE** |
| 提交 | 答题 submit | 网页一键 / CLI | **CLI 为主** |
| 看结果 | 对错解析 | AC/WA + 测试日志 | AC/WA + 日志 |
| 过关 | 题库规则 | **DB + AC** | **DB + AC** |

LabPanel 改造目标：

- 展示 gate 列表、状态（locked/unlocked/passed）、最近 verdict  
- 基础：保留编辑器 +「提交评测」  
- 专业：**隐藏大编辑器**；展示「请用 CLI 提交」+ 复制命令 + 结果轮询  
- 禁止：只靠静态分把 `isPassed` 设 true  

---

## 5. 晋级与评估（OJ 纪律下）

| 场景 | 规则 |
|------|------|
| 导学升阶 | 仍可用题量/正确率/薄弱点（题库 OJ） |
| 基础升专业 | **要求**：配置的基础 gate 全部 `passed`（AC） |
| 专业内 lab 推进 | 上一 lab AC 才 unlock 下一 lab（可配置） |
| 进项目 / 助教通关 | 专业全部 lab gate AC |
| 水平评估 | 仍用**经典题库分层卷**（稳定）；代码能力另开「实验能力」看 gate 通过数 |
| AI 出题 | 仅练习加练，**不产生 gate AC** |

---

## 6. 实施 Phase（按依赖重排）

### Phase A — 数据与纪律（P0，约 2～3 天）

1. Prisma：`LabGateProgress` + `CodeSubmission` 扩展 verdict/gateId/judgeLog，并生成独立 migration  
2. `data/labs/gates.json` 最小定义（含 `judgeKind`）  
3. 规则：**仅 Judge 服务可写 passed**；客户端、静态分析和个人勾选都不能写 `passed`  
4. 去掉/禁用自报 `isPassed` 过关路径  
5. 建立可信身份、跨端 `DailyTaskProgress` 与 PENDING→verdict 状态机  

### Phase B — 基础 unit_oj 真跑测（P0，约 1 周）

1. 选技术：优先 **Docker 跑 `cargo test`**（单题 crate）  
2. Worker 进程：消费队列（可用 DB 表 `JudgeJob` 轮询，免上 Redis）  
3. 接入 3～5 个 rustlings 风格样例题（验证闭环）  
4. 网页：提交 → PENDING → 轮询 → AC/WA  
5. 进度写入 DB  

### Phase C — 专业 integration_oj 最小真跑测（P0/P1，约 1～2 周）

1. 评测镜像：课程指定工具链  
2. CLI：打包 lab 目录或 patch 上传  
3. 跑通 **1 个 lab**（建议 lab1 或课表第一个可脚本化 lab）端到端 AC  
4. 再复制到 lab2～5（测例成熟一个做一个）  
5. Lab 页 IDE-first + 结果展示  

### Phase D — 体验与内容（并行）

1. 大章横栏（已有）+ 关卡进度角标  
2. 导学题型扩展、经典题加难  
3. 助教主路径完成仪式  
4. 文档：学员「如何本地测 + CLI 提交」  

### 明确仍可不做

- 网页多文件 IDE  
- 反作弊完整体系  
- 竞赛级分布式判题集群（人少时单机 Docker 队列即可）  

---

## 7. 工作量与风险（创业现实）

| 项 | 估计 | 风险 |
|----|------|------|
| Phase A | 2～3 天 | 低 |
| Phase B unit_oj | 5～8 天 | 中（Docker/权限/Windows 宿主机） |
| Phase C 一个 lab 真跑 | 1～2 周 | **高**（QEMU/测例/超时） |
| lab2～5 全覆盖 | 视课表测例成熟度 | 高 |

**Windows 开发机**：Docker Desktop 可用，但 riscv/qemu 镜像要验证；生产建议 Linux 评测机。

---

## 8. 成功标准（OJ 版）

1. 基础某 rustlings 题：错误代码 → WA，改对 → AC，且 DB `LabGateProgress.status=passed`  
2. 专业至少 1 个 lab：CLI 提交 → 评测机跑测 → AC 后网页显示已过关  
3. 无法仅靠勾选清单或静态分析把关卡标成 passed  
4. 报告可统计：已 AC 关卡数 / 列表  

---

## 9. 默认拍板（在你「要当 OJ + 进度 DB」前提下）

| # | 项 | 决定 |
|---|-----|------|
| 1 | 进度 | **DB** |
| 2 | 基础 | **unit_oj 真跑测**（rustlings 类） |
| 3 | 专业 | **integration_oj**；编码在 IDE；过关靠 AC |
| 4 | 自报过关 | **废除**作为 passed 条件 |
| 5 | 评估摸底 | 仍经典题库；实验能力看 gate AC |
| 6 | 下一迭代 | **补齐 Phase A 验收 + Phase B 样例闭环** 为 P0；专业全 lab 排在 B 跑通后 |

---

## 10. 一句话

**严肃训练营就应按 OJ 纪律：过关 = 自动评测 AC + 进度落库。**  
基础用小型 unit OJ（rustlings）先打穿闭环；专业用 IDE 提交 + 容器/脚本真跑测，网页只做关卡与结果，不当主编辑器。  

确认「按本 OJ 计划继续执行」后，下一步应先补齐 Phase A 的 migration、鉴权、状态机和跨端个人进度，再进入 Phase B 真判题闭环。
