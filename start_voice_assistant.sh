#!/bin/bash

echo "🌾 FarmWise - Starting the main app"
echo "=================================="

if [ ! -f "package.json" ]; then
  echo "❌ package.json not found in the project root"
  exit 1
fi

npm install --legacy-peer-deps
npm run dev

