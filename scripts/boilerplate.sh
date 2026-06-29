#!/usr/bin/env bash
set -euo pipefail

BOILERPLATE_REPO="${BOILERPLATE_REPO:-git@github.com:m0hill/boilerplate.git}"

NAME="${1:-}"
if [ -z "$NAME" ]; then
  echo "usage: $(basename "$0") <project-name> [target-dir]" >&2
  exit 1
fi

if ! printf '%s' "$NAME" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'; then
  echo "error: '$NAME' is not a valid project name." >&2
  echo "use lowercase letters, digits, and hyphens; start and end with a letter or digit." >&2
  exit 1
fi

for REQUIRED_COMMAND in git nub perl; do
  if ! command -v "$REQUIRED_COMMAND" >/dev/null 2>&1; then
    echo "error: required command '$REQUIRED_COMMAND' was not found on PATH." >&2
    exit 1
  fi
done

PARENT_DIR="${2:-$PWD}"
mkdir -p "$PARENT_DIR"
PARENT_DIR="$(cd "$PARENT_DIR" && pwd)"
DEST="$PARENT_DIR/$NAME"

if [ -e "$DEST" ]; then
  echo "error: '$DEST' already exists." >&2
  exit 1
fi

echo "==> Cloning boilerplate into $DEST"
git clone --depth 1 "$BOILERPLATE_REPO" "$DEST"

cd "$DEST"

echo "==> Removing boilerplate git history"
rm -rf .git

echo "==> Initializing fresh git repository"
git init -q -b main

echo "==> Renaming project to '$NAME'"
perl -i -pe "s/\"name\": \"boilerplate\"/\"name\": \"$NAME\"/" package.json
perl -i -pe "s/Boilerplate/$NAME/g; s/boilerplate/$NAME/g" alchemy.run.ts
perl -i -pe "s/^# boilerplate$/# $NAME/" README.md

rm -f scripts/boilerplate.sh

if [ -f .env.example ]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
fi

echo "==> Installing dependencies"
nub install

git add -A
git commit -q --no-verify -m "Initial commit from boilerplate"

echo
echo "Done. Your project is ready at: $DEST"
echo
echo "Next steps:"
printf '  cd %q\n' "$DEST"
echo "  nub run dev"
echo
echo "When ready to push:"
echo "  git remote add origin <your-remote-url>"
echo "  git push -u origin main"
