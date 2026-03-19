#!/usr/bin/env bash
# Send a message to a Telegram chat via Bot API.
#
# Usage:
#   TELEGRAM_BOT_TOKEN=<token> TELEGRAM_CHAT_ID=<chat_id> ./send-telegram.sh "Your message"
#   TELEGRAM_BOT_TOKEN=<token> TELEGRAM_CHAT_ID=<chat_id> ./send-telegram.sh "Your message" HTML
#
# Environment variables:
#   TELEGRAM_BOT_TOKEN  — Telegram Bot Token (required)
#   TELEGRAM_CHAT_ID    — Telegram Chat ID (required, numeric or @channelname)
#
# Arguments:
#   $1  — message text (required)
#   $2  — parse mode: HTML, Markdown, MarkdownV2, or empty for plain text (optional)

set -euo pipefail

MESSAGE="${1:-}"
PARSE_MODE="${2:-}"

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "Error: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set." >&2
  exit 1
fi

if [ -z "$MESSAGE" ]; then
  echo "Error: message argument cannot be empty." >&2
  exit 1
fi

if [ -n "${PARSE_MODE:-}" ]; then
  payload=$(jq -n \
    --arg chat_id "${TELEGRAM_CHAT_ID}" \
    --arg text "${MESSAGE}" \
    --arg parse_mode "${PARSE_MODE}" \
    '{"chat_id": $chat_id, "text": $text, "parse_mode": $parse_mode}')
else
  payload=$(jq -n \
    --arg chat_id "${TELEGRAM_CHAT_ID}" \
    --arg text "${MESSAGE}" \
    '{"chat_id": $chat_id, "text": $text}')
fi

tg_response_file=$(mktemp)
http_code=$(curl -s -o "$tg_response_file" -w "%{http_code}" \
  -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "$payload")

if [ "$http_code" = "200" ]; then
  echo "Telegram notification sent successfully."
  rm -f "$tg_response_file"
else
  echo "Telegram notification failed (HTTP ${http_code}):" >&2
  cat "$tg_response_file" >&2
  rm -f "$tg_response_file"
  exit 1
fi
