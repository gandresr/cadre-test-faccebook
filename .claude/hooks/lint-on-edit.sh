#!/usr/bin/env bash
# ============================================================================
# Claude Code PostToolUse hook: lint/format files Claude just edited.
#
# Triggered by Write | Edit | MultiEdit | NotebookEdit on a single file path.
# Reads the tool-use payload from stdin, dispatches to the right linter based
# on file extension, and prints a one-line status to stderr.
#
# Policy: NO silent fallbacks. If a required linter for a touched extension
# is missing, the hook fails (exit 2) with a clear install instruction. Edit
# the install table below to add or change required tooling.
#
# Exit codes:
#   0 — clean.
#   2 — linter reported errors OR a required linter is missing. Claude Code
#       surfaces stderr back to the model so the next turn can fix it.
# ============================================================================

set -uo pipefail

# ---- Parse hook input ------------------------------------------------------
input="$(cat)"
file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"

[ -z "$file_path" ] && exit 0
[ ! -f "$file_path" ] && exit 0

# ---- Resolve project root --------------------------------------------------
if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  project_root="$CLAUDE_PROJECT_DIR"
else
  project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi

# Only lint files inside this project.
case "$file_path" in
  "$project_root"/*) ;;
  *) exit 0 ;;
esac

# Skip generated / vendored / state dirs.
case "$file_path" in
  */node_modules/*|*/.next/*|*/.terraform/*|*/dist/*|*/build/*|*/coverage/*|*/.git/*)
    exit 0 ;;
esac

ext="${file_path##*.}"
ext="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
basename_="$(basename "$file_path")"

ok()   { printf '  ✓ %-18s %s\n' "$1" "$basename_" >&2; }
fail() {
  printf '  ✗ %-18s %s\n' "$1" "$basename_" >&2
  printf '%s\n' "$2" >&2
}
missing() {
  # $1: tool name, $2: install instruction
  printf '  ✗ %-18s %s — REQUIRED LINTER MISSING\n' "$1" "$basename_" >&2
  printf '    Install: %s\n' "$2" >&2
}

# Locate a JS-toolchain binary: prefer project node_modules, then PATH.
# Echoes the path on success, returns 127 on failure.
locate_bin() {
  local name="$1"
  if [ -x "$project_root/node_modules/.bin/$name" ]; then
    printf '%s' "$project_root/node_modules/.bin/$name"
    return 0
  fi
  if command -v "$name" >/dev/null 2>&1; then
    command -v "$name"
    return 0
  fi
  return 127
}

# ---- Dispatch by extension -------------------------------------------------
errors=0

case "$ext" in

  py)
    if ! command -v ruff >/dev/null 2>&1; then
      missing "ruff" "pip install ruff   (or: brew install ruff)"
      exit 2
    fi
    out="$(ruff check --fix --quiet "$file_path" 2>&1)"; rc=$?
    if [ $rc -ne 0 ]; then fail "ruff check" "$out"; errors=1; else ok "ruff check"; fi
    out="$(ruff format --quiet "$file_path" 2>&1)"; rc=$?
    if [ $rc -ne 0 ]; then fail "ruff format" "$out"; errors=1; else ok "ruff format"; fi
    ;;

  ts|tsx|js|jsx|mjs|cjs)
    bin="$(locate_bin eslint)" || {
      missing "eslint" "npm i -D eslint   (run from project root)"
      exit 2
    }
    out="$("$bin" --fix --no-error-on-unmatched-pattern "$file_path" 2>&1)"; rc=$?
    if [ $rc -ne 0 ]; then fail "eslint" "$out"; errors=1; else ok "eslint"; fi
    bin="$(locate_bin prettier)" || {
      missing "prettier" "npm i -D prettier"
      exit 2
    }
    out="$("$bin" --write --log-level warn "$file_path" 2>&1)"; rc=$?
    if [ $rc -ne 0 ]; then fail "prettier" "$out"; errors=1; else ok "prettier"; fi
    ;;

  css|scss|sass|less)
    bin="$(locate_bin stylelint)" || {
      missing "stylelint" "npm i -D stylelint stylelint-config-standard"
      exit 2
    }
    out="$("$bin" --fix --allow-empty-input "$file_path" 2>&1)"; rc=$?
    if [ $rc -ne 0 ]; then fail "stylelint" "$out"; errors=1; else ok "stylelint"; fi
    bin="$(locate_bin prettier)" || {
      missing "prettier" "npm i -D prettier"
      exit 2
    }
    out="$("$bin" --write --log-level warn "$file_path" 2>&1)"; rc=$?
    if [ $rc -ne 0 ]; then fail "prettier" "$out"; errors=1; else ok "prettier"; fi
    ;;

  html|htm|json|md|mdx|yaml|yml)
    bin="$(locate_bin prettier)" || {
      missing "prettier" "npm i -D prettier"
      exit 2
    }
    out="$("$bin" --write --log-level warn "$file_path" 2>&1)"; rc=$?
    if [ $rc -ne 0 ]; then fail "prettier" "$out"; errors=1; else ok "prettier"; fi
    ;;

  tf|tfvars|hcl)
    if ! command -v terraform >/dev/null 2>&1; then
      missing "terraform" "brew install terraform   (or download from hashicorp.com)"
      exit 2
    fi
    out="$(terraform fmt "$file_path" 2>&1)"; rc=$?
    if [ $rc -ne 0 ]; then fail "terraform fmt" "$out"; errors=1; else ok "terraform fmt"; fi
    ;;

  sh|bash)
    if ! command -v shellcheck >/dev/null 2>&1; then
      missing "shellcheck" "brew install shellcheck"
      exit 2
    fi
    out="$(shellcheck "$file_path" 2>&1)"; rc=$?
    if [ $rc -ne 0 ]; then fail "shellcheck" "$out"; errors=1; else ok "shellcheck"; fi
    ;;

  *)
    # Unknown extension — no linter mapped, no-op.
    exit 0
    ;;

esac

[ $errors -ne 0 ] && exit 2
exit 0
