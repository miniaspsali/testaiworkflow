#!/usr/bin/env sh
set -e

# Install agent-browser globally if not already installed
if ! command -v agent-browser >/dev/null 2>&1; then
  npm install --global agent-browser
fi

# Detect Chrome/Chromium executable path
browser_path=""
for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    browser_path="$(command -v "$candidate")"
    break
  fi
done

# Set the executable path env var, or fall back to agent-browser install
if [ -n "$browser_path" ]; then
  printf 'AGENT_BROWSER_EXECUTABLE_PATH=%s\n' "$browser_path" >> "$GITHUB_ENV"
  export AGENT_BROWSER_EXECUTABLE_PATH="$browser_path"
else
  agent-browser install
fi
