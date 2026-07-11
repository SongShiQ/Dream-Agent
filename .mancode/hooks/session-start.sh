#!/bin/bash
# .mancode/hooks/session-start.sh
# mancode SessionStart hook - 加载项目上下文
# 系统依赖：bash、git、（可选）jq
set -uo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")"
STATE_FILE="$PROJECT_ROOT/.mancode/state.json"
PROFILE_FILE="$PROJECT_ROOT/.mancode/project-profile.json"

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

json_any_get() {
    local key="$1"
    local file="$2"
    if [ "$HAS_JQ" = "1" ]; then
        jq -r ".$key // empty" "$file" 2>/dev/null || true
    else
        grep "\"$key\"" "$file" 2>/dev/null | head -n 1 | sed -E 's/.*: *"?([^",}]*)"?[,]?.*/\1/' || true
    fi
}

if [ ! -f "$STATE_FILE" ]; then
    echo "ℹ️ mancode 未初始化。运行 \`mancode init\` 开始。"
    exit 0
fi

# 清洗函数：去换行、限制长度（防止脏数据污染 prompt）
sanitize() {
    printf '%s' "$1" | tr '\n\r' ' ' | head -c 200
}

MODE=$(json_get "currentMode" "$STATE_FILE")
TECH_STACK=$(json_get "techStack" "$STATE_FILE")
UI_LIBRARY=$(json_get "uiLibrary" "$STATE_FILE")
TEAM_AUTO=$(json_any_get "teamModeAutoDetected" "$STATE_FILE")
CONTRIBUTORS=$(json_any_get "contributors" "$STATE_FILE")

echo "mancode_mode: ${MODE:-solo}"
echo "project_type: $(sanitize "$TECH_STACK")"
echo "ui_library: $(sanitize "$UI_LIBRARY")"
echo ""

echo "## mancode · ${MODE:-solo} mode"
echo ""
echo "你正在使用 mancode ${MODE:-solo} 模式。"
echo ""
echo "### 核心原则"
echo "1. **优先复用项目已有代码**"
echo "   - 检查已检测到的源码目录和已有类似实现"
echo "   - 复用现有组件、函数、样式"
echo ""
if [ "$(json_get "uiAssets" "$PROFILE_FILE")" = "detected" ]; then
    echo "2. **应用项目审美 token**（仅在项目 profile 确认有 UI 资产且任务涉及 UI 时）"
    echo "   - UI library: $(sanitize "$UI_LIBRARY")"
    echo "   - 使用项目已有的设计 token"
else
    echo "2. **按项目能力工作**"
    echo "   - 不假定存在 UI、浏览器或特定技术栈"
    echo "   - 先读取 project-profile 与项目现有验证方式"
fi
echo ""
echo "3. **最小改动**"
echo "   - 只改用户要求的部分"
echo "   - 不重构无关代码"

if [ "$TEAM_AUTO" = "true" ] && [ "${MODE:-solo}" = "solo" ]; then
    echo ""
    echo "### 团队协作提醒"
    echo "检测到团队项目（contributors: ${CONTRIBUTORS:-2}）。"
    echo '- 涉及多人协作、交接、PR、共享模块时，优先使用 /manteam <task>。'
    echo '- 只做个人小改动时，可以继续 solo；需要退出流程用 /mansolo。'
fi
