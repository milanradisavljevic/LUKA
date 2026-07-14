#!/usr/bin/env bash
set -euo pipefail

# Baut die NATASCHA-CLI für beide macOS-Architekturen. PyInstaller muss je
# Architektur laufen; lipo erzeugt daraus ein universelles Sidecar für den
# Tauri-Universal-Build.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

python3 -m pip install --upgrade pyinstaller
python3 -m pip install -r requirements_cli.txt -r requirements_tui.txt

OUT_DIR="$ROOT/dist/natascha-cli"
BUILD_DIR="$ROOT/dist/sidecar-build"
rm -rf "$BUILD_DIR"
mkdir -p "$OUT_DIR" "$BUILD_DIR"

build_arch() {
  local arch="$1"
  local target="$2"
  local python_cmd=(python3)
  if [[ "$arch" == "x86_64" ]]; then
    python_cmd=(arch -x86_64 python3)
  fi

  "${python_cmd[@]}" -m PyInstaller \
    --clean \
    --noconfirm \
    --onefile \
    --name "natascha-cli-$target" \
    --distpath "$BUILD_DIR/$target" \
    --workpath "$BUILD_DIR/work-$target" \
    --specpath "$BUILD_DIR/spec-$target" \
    --add-data "$ROOT/feedback_schema.json:." \
    --add-data "$ROOT/natascha_config.toml:." \
    --add-data "$ROOT/rubrics:rubrics" \
    --add-data "$ROOT/prompts:prompts" \
    --collect-data textual \
    "$ROOT/natascha_cli.py"
  cp "$BUILD_DIR/$target/natascha-cli-$target" "$OUT_DIR/natascha-cli-$target"
}

build_arch "aarch64" "aarch64-apple-darwin"
build_arch "x86_64" "x86_64-apple-darwin"

lipo -create \
  "$OUT_DIR/natascha-cli-aarch64-apple-darwin" \
  "$OUT_DIR/natascha-cli-x86_64-apple-darwin" \
  -output "$OUT_DIR/natascha-cli-universal-apple-darwin"

echo "NATASCHA Sidecar universal gebaut: $OUT_DIR/natascha-cli-universal-apple-darwin"
