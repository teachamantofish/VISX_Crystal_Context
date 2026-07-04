#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "Installing dependencies..."
npm install

echo "Building and packaging..."
npm run package

echo ""
echo "Done. Install the new VSIX:"
ls -lh prompt-builder-*.vsix
