#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_SOURCE="$ROOT_DIR/CV/CV_121525.tex"
SOURCE_TEX="${1:-$DEFAULT_SOURCE}"
OUTPUT_PDF="${2:-$ROOT_DIR/Ahokovi_CV.pdf}"
BUILD_DIR="$ROOT_DIR/tmp/cv-build"

if [[ ! -f "$SOURCE_TEX" ]]; then
    echo "Source TeX file not found: $SOURCE_TEX" >&2
    exit 1
fi

mkdir -p "$BUILD_DIR"

SOURCE_DIR="$(cd "$(dirname "$SOURCE_TEX")" && pwd)"
SOURCE_FILE="$(basename "$SOURCE_TEX")"
SOURCE_STEM="${SOURCE_FILE%.tex}"

(
    cd "$SOURCE_DIR"
    latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir="$BUILD_DIR" "$SOURCE_FILE"
)

cp "$BUILD_DIR/$SOURCE_STEM.pdf" "$OUTPUT_PDF"

echo "Built $OUTPUT_PDF from $SOURCE_TEX"
