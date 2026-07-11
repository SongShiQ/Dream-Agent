#!/bin/bash
# .mancode/hooks/user-prompt-submit.sh
# mancode UserPromptSubmit hook - 注入 6 问追问 + 审美 token
set -uo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")"
STATE_FILE="$PROJECT_ROOT/.mancode/state.json"
AESTHETICS_FILE="$PROJECT_ROOT/.mancode/aesthetics/style-tokens.json"

HAS_JQ=0
if [ "${MANCODE_DISABLE_JQ:-0}" != "1" ]; then
    command -v jq >/dev/null 2>&1 && HAS_JQ=1
fi

json_get() {
    local key="$1"
    local file="$2"
    if [ "$HAS_JQ" = "1" ]; then
        jq -r ".$key // empty" "$file" 2>/dev/null || true
    else
        grep "\"$key\"" "$file" 2>/dev/null | sed -E 's/.*: *"([^"]*)".*/\1/' || true
    fi
}

# 清洗注入到 prompt 的动态值：去换行、限制长度，避免脏 token 污染上下文结构
sanitize() {
    printf '%s' "$1" | tr '\n\r' ' ' | head -c 200
}

MODE=$(json_get "currentMode" "$STATE_FILE")

# 只在 solo 模式下输出 6 问
if [ "$MODE" = "solo" ]; then
    echo "## 动手前，先想六个问题："
    echo ""
    echo "1. **为什么做？**"
    echo "   - 这个改动解决什么问题？"
    echo ""
    echo "2. **已经有什么？**"
    echo "   - 项目里有没有类似的实现可以复用？"
    echo ""
    echo "3. **最少改多少？**"
    echo "   - 能用一行解决吗？能复用现有代码吗？"
    echo ""
    echo "4. **能不能不拆新系统？**"
    echo "   - 不新建文件或模块能完成吗？"
    echo ""
    echo "5. **非平凡逻辑怎样最小运行验证？**"
    echo ""
    echo "6. **有什么没把握的？**"
    echo "   - 先自行查代码或文档，最多 2 次工具调用；仍不确定再问用户。"
    echo ""
fi

# Claude Code 通过 stdin 传入 JSON: {"prompt": "...", ...}
# 先读取完整输入，再解析
INPUT=$(cat)

if [ "$HAS_JQ" = "1" ]; then
    USER_PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""' 2>/dev/null)
    # jq 失败或返回空，fallback 到原始输入
    if [ -z "$USER_PROMPT" ]; then
        USER_PROMPT="$INPUT"
    fi
else
    # 无 jq: 使用 sed 提取 JSON 中的 prompt 字段
    USER_PROMPT=$(echo "$INPUT" | sed -n 's/.*"prompt"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
    # sed 失败，fallback 到原始输入
    if [ -z "$USER_PROMPT" ]; then
        USER_PROMPT="$INPUT"
    fi
fi

if [ "$MODE" = "solo" ] && echo "$USER_PROMPT" | grep -qiE "先(别|不要|看|看看|调研|分析|评估)|给.*方案|给.*计划|怎么.*做|如何.*做|怎么.*实现|如何.*实现|应该怎么|怎么.*拆|拆分|只给.*计划|不要.*改代码|别.*改代码|不要.*动代码|别.*动代码|评估.*风险|风险.*评估|设计.*方案|架构|迁移|集成|\b(plan|planning|research|investigate|approach|proposal|architecture|risk|migration|integration)\b|how (should|would|to)|do not (edit|modify|change)|don.t (edit|modify|change)|no code changes|without changing code"; then
    echo "## mancode 自动路由"
    echo ""
    echo "这个请求是规划/调研类任务。不要直接进入 solo 实施。"
    echo "必须先调用 Skill tool，skill='man'，把用户原始请求作为 task，执行 Scout 调研、澄清和 Plan Coach plan。"
    echo "用户只要计划时，在 Step 4 选择“只要计划”；不要切到另一个命令。"
    echo ""
fi

# UI token 仅在 profile 确认存在 UI 资产且任务明确涉及 UI 时注入。
PROFILE_FILE="$PROJECT_ROOT/.mancode/project-profile.json"
UI_ASSETS=""
if [ -f "$PROFILE_FILE" ]; then
    UI_ASSETS=$(json_get "uiAssets" "$PROFILE_FILE")
fi
if [ "$UI_ASSETS" = "detected" ] && echo "$USER_PROMPT" | grep -qiE "\b(button|component|page|style|ui|design|layout|css|color|font|theme|card|input|modal|dialog|header|footer|sidebar|dropdown|tooltip|toast|avatar|badge)\b|界面|页面|按钮|样式|颜色|字体|布局|组件|弹窗|导航|卡片|输入框|主题|美化|优化.*界面|调整.*样式"; then
    if [ -f "$AESTHETICS_FILE" ]; then
        MATCH_LEVEL=$(json_get "matchLevel" "$AESTHETICS_FILE")

        if [ "$MATCH_LEVEL" = "high" ]; then
            if [ "$HAS_JQ" = "1" ]; then
            # 提取摘要 + cap（docs/07 §4.1：colors ≤8, fonts ≤4, 总 < 800 tokens）
            UI=$(jq -r '.uiLibrary // empty' "$AESTHETICS_FILE" 2>/dev/null)
            DARK=$(jq -r '.darkMode // empty' "$AESTHETICS_FILE" 2>/dev/null)
            MATCH=$(jq -r '.matchLevel // empty' "$AESTHETICS_FILE" 2>/dev/null)
            COLORS=$(jq -r '.colors | to_entries | map(select(.key | test("^[A-Za-z0-9_-]{1,80}$"))) | .[0:8] | map("\(.key)=\(.value)") | join(", ")' "$AESTHETICS_FILE" 2>/dev/null)
            FONTS=$(jq -r '.fonts | to_entries | map(select(.key | test("^[A-Za-z0-9_-]{1,80}$"))) | .[0:4] | map("\(.key)=\(.value | first)") | join(", ")' "$AESTHETICS_FILE" 2>/dev/null)
            COMPONENTS=$(jq -r '(.components // []) | map(select(test("^[A-Z][A-Za-z0-9]{0,79}$"))) | .[0:8] | join(", ")' "$AESTHETICS_FILE" 2>/dev/null)
            CSS_VARS=$(jq -r '(.cssVariables // {}) | to_entries | map(select(.key | test("^[A-Za-z0-9_-]{1,80}$"))) | .[0:8] | map("--\(.key)=\(.value)") | join(", ")' "$AESTHETICS_FILE" 2>/dev/null)

            echo "## 审美 token 摘要"
            [ -n "$UI" ] && echo "UI: $(sanitize "$UI")"
            [ -n "$DARK" ] && echo "Dark: $(sanitize "$DARK")"
            [ -n "$MATCH" ] && echo "Match: $(sanitize "$MATCH")"
            [ -n "$COLORS" ] && echo "Colors (前 8): $(sanitize "$COLORS")"
            [ -n "$FONTS" ] && echo "Fonts (前 4): $(sanitize "$FONTS")"
            [ -n "$COMPONENTS" ] && echo "Components (前 8): $(sanitize "$COMPONENTS")"
            [ -n "$CSS_VARS" ] && echo "CSS variables (前 8): $(sanitize "$CSS_VARS")"
            echo "完整 token: .mancode/aesthetics/style-tokens.json"
            echo ""
        else
            # 无 jq: 只输出指针（cap 无法严格执行）
            echo "## 审美 token"
            echo "读取 .mancode/aesthetics/style-tokens.json"
            echo ""
        fi
    fi
fi
fi
