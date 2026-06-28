#!/usr/bin/env bash
# ============================================================
# Pre-commit secret scanner for Talk2Me AI
# Blocks commits that contain leaked credentials.
#
# Install as a pre-commit hook:
#   chmod +x scripts/check-secrets.sh
#   ln -sf ../../scripts/check-secrets.sh .git/hooks/pre-commit
# ============================================================

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🔍 Scanning staged files for leaked secrets..."

# Get all staged files (tracked by git)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)

if [ -z "$STAGED_FILES" ]; then
  echo -e "${GREEN}✅ No staged files to scan.${NC}"
  exit 0
fi

FAIL=0

# ── Patterns to block ──────────────────────────────────────
declare -A PATTERNS
PATTERNS["Supabase Service Role Key"]="eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+"
PATTERNS["Supabase Access Token"]="sbp_[a-zA-Z0-9]+"
PATTERNS["LiveKit API Secret"]="LIVEKIT_API_SECRET\s*=\s*\S+"
PATTERNS["LiveKit API Key"]="LIVEKIT_API_KEY\s*=\s*\S+"
PATTERNS["Database Password"]="SUPABASE_DB_PASSWORD\s*=\s*\S+"
PATTERNS["Generic API Key"]="(api_key|API_KEY|apikey)\s*[:=]\s*['\"]?[a-zA-Z0-9]{20,}['\"]?"
PATTERNS["Generic Secret"]="(secret|SECRET)\s*[:=]\s*['\"]?[a-zA-Z0-9/+]{20,}['\"]?"

# Files to always skip (safe to have these patterns)
SKIP_PATTERNS=(
  ".env.example"
  "*.test.ts"
  "*.spec.ts"
  "check-secrets.sh"
  "*.md"
)

for FILE in $STAGED_FILES; do
  # Skip non-existent files (deleted)
  [ -f "$FILE" ] || continue

  # Skip known-safe files
  SHOULD_SKIP=false
  for SKIP in "${SKIP_PATTERNS[@]}"; do
    if [[ "$FILE" == $SKIP ]]; then
      SHOULD_SKIP=true
      break
    fi
  done
  $SHOULD_SKIP && continue

  # Skip .env files — they should never be staged anyway (caught by gitignore)
  if [[ "$FILE" == .env* ]]; then
    echo -e "${RED}🚫 BLOCKED: Attempting to commit env file: ${FILE}${NC}"
    echo -e "   Add '${FILE}' to .gitignore and run: git rm --cached ${FILE}"
    FAIL=1
    continue
  fi

  # Check for secret patterns
  for PATTERN_NAME in "${!PATTERNS[@]}"; do
    PATTERN="${PATTERNS[$PATTERN_NAME]}"
    if git diff --cached -- "$FILE" | grep -qE "$PATTERN" 2>/dev/null; then
      echo -e "${RED}🚫 BLOCKED: Possible ${PATTERN_NAME} found in: ${FILE}${NC}"
      echo -e "   Remove the secret and use environment variables instead."
      FAIL=1
    fi
  done

done

if [ "$FAIL" -eq 1 ]; then
  echo ""
  echo -e "${RED}══════════════════════════════════════════════════${NC}"
  echo -e "${RED}  ❌ COMMIT BLOCKED — Secrets detected in staged files${NC}"
  echo -e "${RED}══════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "${YELLOW}  Fix: Remove secrets from the files above.${NC}"
  echo -e "${YELLOW}  Use environment variables in .env.local instead.${NC}"
  echo -e "${YELLOW}  Then run: git add -p (to stage only clean changes)${NC}"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ No secrets detected. Proceeding with commit.${NC}"
exit 0
