# KIE AI Image Generator

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/web-ui-kie-ai)

Personal AI generation web app powered by [KIE.ai](https://kie.ai): text-to-image, image upscaling, and a music → mix → video pipeline. Everything it produces is stored in your own Cloudflare R2 bucket.

## Features

### Images

- **Text-to-image generation** via KIE.ai API (SeeDream 4.5 and extensible to other models)
- **Upscale** — pick an image from the gallery or upload one, then compare before/after side by side
- **Gallery** — paginated grid of all generated images with full-size view, download, and delete
- **Real-time progress** — the page streams task updates over SSE and settles when the kie.ai callback fires; a recovery sweep picks up tasks orphaned by a missed webhook
- **Flexible model system** — add new models by editing `lib/models.ts`, no UI changes needed

### Music & video

The `/music` page is a three-stage flow, each stage feeding the next:

1. **Generate** — genre presets (lofi, trap, phonk, ambient, jazz, and more) fill an editable style prompt. Pick a ~21s loop (cheapest, best for long mixes) or a 1–6 minute track. Instrumental by default; vocal mode takes your own lyrics plus an optional voice gender. Each generation returns two takes.
2. **Mix** — select the tracks you like and a target length (5, 15, 30, or 60 minutes). ffmpeg chains them with 2-second crossfades into a single 192 kbps MP3, repeating the selection as needed to hit the target.
3. **Video** — pair a finished mix with a background, from either source:
   - **Still image** already stored in your R2 bucket. The renderer builds one 60-second seamless pan at 1080p30.
   - **AI clip** generated from a text prompt by Veo 3.1 Lite (8 seconds at 1080p, about 35 credits). The clip's last frame never matches its first, so the seam is closed by crossfading the tail back onto the head, leaving a 7-second loop. Clips are reusable across mixes.

   Either way one short loop is rendered once and stream-copied under the full mix, so a one-hour mix costs one short render. Progress reports the actual ffmpeg stage, not just a spinner. An AI clip encodes roughly 0.8 GB per hour of output against 235 MB for a still pan, because the frame keeps changing.

Mixes and renders both run server-side and upload the result to R2, where the mix and video libraries list them for playback and download.

Music tasks are polled rather than webhook-driven (the kie.ai Suno endpoints require a `callBackUrl`, but the app does not depend on it). A reconcile sweep finishes tasks whose browser tab was closed mid-generation.

### General

- **Dark mode** (default) with light mode toggle
- **Credit balance** in the header, refreshed after every generation
- **Optional password gate** for the whole app

## Tech Stack

- **Next.js 16** (App Router, TypeScript) + **React 19**
- **shadcn/ui** + Tailwind CSS v4, **Motion** for transitions
- **Drizzle ORM** + SQLite (`better-sqlite3`)
- **Cloudflare R2** (S3-compatible via `@aws-sdk/client-s3`)
- **SWR** for polling / data fetching
- **ffmpeg** (system binary) for audio mixes and video renders
- **Vitest** for unit tests

## Setup

### 1. Prerequisites

- Node.js 22+
- **ffmpeg** on your `PATH` — required by the mix and video stages:

  ```bash
  brew install ffmpeg      # macOS
  sudo apt install ffmpeg  # Debian/Ubuntu
  ```

  The Docker image installs it already. Without ffmpeg, image and music generation still work, but mixing and video rendering fail.

### 2. Clone & install

```bash
git clone https://github.com/zahidakhyar/web-ui-kie-ai.git
cd web-ui-kie-ai
npm install
```

### 3. Environment variables

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
| `R2_PUBLIC_URL` | ✅ | Public URL of your R2 bucket (or r2.dev subdomain). The video builder only accepts background images served from this origin, so renders fail while it is unset |
| `DATABASE_PATH` | — | SQLite DB path (default: `./data/app.db`) |
| `ADMIN_PASSWORD` | — | Password gate for the app (leave unset to disable auth) |
| `AUTH_SECRET` | ⚠️ | Required if `ADMIN_PASSWORD` is set — secret used to sign the session cookie |

> **Callbacks in development:** Use [ngrok](https://ngrok.com/) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) to expose `localhost:3000` publicly. Set the tunnel URL as `NEXT_PUBLIC_APP_URL`.

### 4. Migrate database

```bash
npm run db:migrate
```

### 5. Run

```bash
npm run dev       # development
npm run build && npm start  # production
npm test          # unit tests (Vitest)
```

> **Deploying:** video rendering peaks around 400 MB of RAM on top of the app itself, so give the container at least 2 GB. A container killed mid-render reports the signal that stopped ffmpeg (usually `SIGKILL` = out of memory).

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
  upscale/page.tsx      — Upscale UI
  music/page.tsx        — Music: generate → mix → video
  gallery/page.tsx      — Gallery page
  login/                — Password gate (server action)
  api/
    generate/           — POST: creates a KIE.ai task
    task/[taskId]/      — GET: polls task status | stream/: SSE progress
    callback/           — POST: receives KIE.ai webhook, uploads to R2
    gallery/            — GET: paginated gallery | DELETE: remove task+images
    upload/, uploads/   — POST: upload an image to R2 | GET/DELETE: manage uploads
    credits/            — GET: remaining KIE.ai credits
    music/
      generate/         — POST: creates a Suno task
      task/[taskId]/    — GET: polls the task and syncs finished tracks
      library/          — GET: generated tracks
      mix/, mixes/      — POST: assemble a mix | GET: mix status and list
      video/, videos/   — POST: render a video | GET: render status and list
      clip/, clips/       — POST: generate an AI background clip | GET: clip status and list
lib/
  kie-ai.ts             — KIE.ai API client (image models + credits)
  r2.ts                 — Cloudflare R2 upload/delete helpers
  db.ts                 — Drizzle singleton
  schema.ts             — Database schema (tasks, images, uploads, music, mixes, clips, renders)
  models.ts             — Model registry
  images/               — Orphaned-task recovery for the image pipeline
  suno/                 — Suno client, request builder, limits, storage, reconcile
  music/                — Genre presets
  audio/                — Mix planner and the ffmpeg acrossfade chain
  video/                — Pan clip, seam-loop and loop-mux argv builders, the Veo
                          client, and the clip and render jobs
components/
  generator/            — Form, model selector, parameter fields, progress
  upscale/              — Gallery picker, before/after compare, progress
  music/                — Music form, track list, mix and video builders, libraries
  gallery/              — Grid and image cards
  layout/               — Header, theme provider
  motion/               — Shared animation wrappers
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
