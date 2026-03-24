#!/usr/bin/env bash
set -euo pipefail

attempt=1
exit_code=0
max_attempts=5

while true; do
  if gh api "$@"; then
    exit 0
  else
    exit_code=$?
  fi

  if (( attempt >= max_attempts )); then
    exit "${exit_code}"
  fi

  echo "::warning::gh api failed (attempt ${attempt}/${max_attempts}); retrying in 6 seconds..."
  sleep 6
  attempt=$((attempt + 1))
done
