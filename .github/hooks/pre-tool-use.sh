#!/bin/bash
# Pre-tool-use hook: block gh CLI and GitHub REST API usage

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName')
TOOL_ARGS=$(echo "$INPUT" | jq -r '.toolArgs')

# Block GitHub MCP server tools (direct GitHub REST API access via MCP)
if echo "$TOOL_NAME" | grep -qE '^github[-_]mcp[-_]server'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"GitHub REST API (via MCP server) is prohibited in this project. Use ClawBrain internal tools instead."}'
  exit 0
fi

# For bash tool, inspect the command
if [ "$TOOL_NAME" = "bash" ]; then
  COMMAND=$(echo "$TOOL_ARGS" | jq -r '.command // empty')

  # Block gh CLI usage
  if echo "$COMMAND" | grep -qE '(^| |;|&&|\|\|)gh( |$)'; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"gh CLI is prohibited in this project. Use ClawBrain internal tools instead."}'
    exit 0
  fi

  # Block direct GitHub REST API calls (curl/wget to api.github.com)
  if echo "$COMMAND" | grep -qE 'api\.github\.com'; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"Direct GitHub REST API calls (api.github.com) are prohibited in this project. Use ClawBrain internal tools instead."}'
    exit 0
  fi
fi

exit 0
