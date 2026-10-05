#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
[ -f .env ] || cp .env.example .env
[ -d node_modules ] || npm install
printf '\nWebsite: http://localhost:5173\nCMS:     http://localhost:5174\nAPI:     http://localhost:8787/api/health\n\n'
npm run dev
