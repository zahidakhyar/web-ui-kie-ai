# KIE AI Image Generator

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/web-ui-kie-ai)

Personal AI image generation web app powered by [KIE.ai](https://kie.ai), with Cloudflare R2 storage and a responsive gallery.

## Features

- **Text-to-image generation** via KIE.ai API (SeeDream 4.5 and extensible to other models)
- **Dark mode** (default) with light mode toggle
- **Real-time progress** — polls task status; auto-updates when kie.ai callback fires
- **Cloudflare R2 storage** — generated images are downloaded and stored in your R2 bucket
- **Gallery** — paginated grid of all generated images with full-size view, download, and delete
- **Flexible model system** — add new models by editing `lib/models.ts`, no UI changes needed

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **shadcn/ui** + Tailwind CSS
- **Drizzle ORM** + SQLite (`better-sqlite3`)
- **Cloudflare R2** (S3-compatible via `@aws-sdk/client-s3`)
- **SWR** for polling / data fetching

## Setup

### 1. Clone & install

```bash
git clone https://github.com/zahidakhyar/web-ui-kie-ai.git
cd web-ui-kie-ai
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Required | Description |
|---|---|---|
| `KIE_API_KEY` | ✅ | Your KIE.ai API key |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public URL of this app (for callbacks) |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | ✅ | R2 access key |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 secret key |
| `R2_BUCKET_NAME` | ✅ | R2 bucket name |
| `R2_PUBLIC_URL` | ⚠️ | Public URL of your R2 bucket (or r2.dev subdomain) |
| `DATABASE_PATH` | — | SQLite DB path (default: `./data/app.db`) |
| `ADMIN_PASSWORD` | — | Password gate for the app (leave unset to disable auth) |
| `AUTH_SECRET` | ⚠️ | Required if `ADMIN_PASSWORD` is set — secret used to sign the session cookie |

> **Callbacks in development:** Use [ngrok](https://ngrok.com/) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) to expose `localhost:3000` publicly. Set the tunnel URL as `NEXT_PUBLIC_APP_URL`.

### 3. Migrate database

```bash
npm run db:migrate
```

### 4. Run

```bash
npm run dev       # development
npm run build && npm start  # production
```

## Adding New Models

Edit `lib/models.ts` and add a new entry to the `MODELS` array. The UI will automatically render the appropriate controls based on the `parameters` config.

```ts
{
  id: "new-provider/model-name",
  name: "Model Display Name",
  description: "What this model does.",
  provider: "Provider Name",
  parameters: [
    { key: "prompt", label: "Prompt", type: "textarea", required: true },
    { key: "style", label: "Style", type: "select", options: [...], required: false },
  ],
}
```

## Architecture

```
app/
  page.tsx              — Generator UI
  gallery/page.tsx      — Gallery page
  api/
    generate/           — POST: creates a KIE.ai task
    task/[taskId]/      — GET: polls task status
    callback/           — POST: receives KIE.ai webhook, uploads to R2
    gallery/            — GET: paginated gallery | DELETE: remove task+images
lib/
  kie-ai.ts             — KIE.ai API client
  r2.ts                 — Cloudflare R2 upload/delete helpers
  db.ts                 — Drizzle singleton
  schema.ts             — Database schema (tasks + images tables)
  models.ts             — Model registry
components/
  generator/            — Form, model selector, parameter fields, progress
  gallery/              — Grid and image cards
  layout/               — Header, theme provider
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
