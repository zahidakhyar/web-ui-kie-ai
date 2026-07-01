#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing dependencies"
npm install

if [ ! -f .env.local ]; then
  echo "==> Creating .env.local from .env.example"
  cp .env.example .env.local
  echo "    Edit .env.local with your KIE.ai and Cloudflare R2 credentials before running the app."
else
  echo "==> .env.local already exists, skipping"
fi

echo "==> Running database migrations"
npm run db:migrate

echo ""
echo "Setup complete. Next steps:"
echo "  1. Edit .env.local (see README for required variables)"
echo "  2. npm run dev"
