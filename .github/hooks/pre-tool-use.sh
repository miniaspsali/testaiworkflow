#!/bin/bash
# Pre-tool-use hook: block gh CLI and GitHub REST API usage
# Specifically prohibits autonomous issue commenting

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName')
TOOL_ARGS=$(echo "$INPUT" | jq -r '.toolArgs')

POLICY_NOTE="【重要政策】你不可以自行在任何 Issue 上留言、建立評論，或透過任何方式（gh CLI / GitHub REST API / MCP 工具）直接操作 GitHub Issues。如需與 Issue 互動，請通知人工介入處理。"

# Block GitHub MCP server tools (direct GitHub REST API access via MCP)
if echo "$TOOL_NAME" | grep -qE '^github[-_]mcp[-_]server'; then
  REASON="❌ 禁止使用 GitHub MCP Server 工具（直接存取 GitHub REST API）。${POLICY_NOTE}"
  echo "⚠️  [Policy Hook] 已攔截 MCP 工具呼叫: ${TOOL_NAME}" >&2
  jq -cn --arg r "$REASON" '{"permissionDecision":"deny","permissionDecisionReason":$r}'
  exit 0
fi

# For bash tool, inspect the command
if [ "$TOOL_NAME" = "bash" ]; then
  COMMAND=$(echo "$TOOL_ARGS" | jq -r '.command // empty')

  # Specifically detect issue commenting attempts (highest priority check)
  if echo "$COMMAND" | grep -qE 'gh issue comment|issues/[0-9]+/comments|issue.*comment'; then
    REASON="❌ 禁止自行在 Issue 上留言。${POLICY_NOTE}"
    echo "⚠️  [Policy Hook] 已攔截 Issue 留言操作: ${COMMAND}" >&2
    jq -cn --arg r "$REASON" '{"permissionDecision":"deny","permissionDecisionReason":$r}'
    exit 0
  fi

  # Block gh CLI usage
  if echo "$COMMAND" | grep -qE '(^| |;|&&|\|\|)gh( |$)'; then
    REASON="❌ 禁止使用 gh CLI。${POLICY_NOTE}"
    echo "⚠️  [Policy Hook] 已攔截 gh 指令: ${COMMAND}" >&2
    jq -cn --arg r "$REASON" '{"permissionDecision":"deny","permissionDecisionReason":$r}'
    exit 0
  fi

  # Block direct GitHub REST API calls (curl/wget to api.github.com)
  if echo "$COMMAND" | grep -qE 'api\.github\.com'; then
    REASON="❌ 禁止直接呼叫 GitHub REST API (api.github.com)。${POLICY_NOTE}"
    echo "⚠️  [Policy Hook] 已攔截 GitHub API 呼叫: ${COMMAND}" >&2
    jq -cn --arg r "$REASON" '{"permissionDecision":"deny","permissionDecisionReason":$r}'
    exit 0
  fi
fi

exit 0
