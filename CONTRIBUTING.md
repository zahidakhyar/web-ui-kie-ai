# Contributing

Thanks for considering a contribution to KIE AI Image Generator.

## Setup

```bash
git clone https://github.com/zahidakhyar/web-ui-kie-ai.git
cd web-ui-kie-ai
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

See the [README](README.md#2-environment-variables) for the full list of environment variables (KIE.ai, Cloudflare R2, and auth secrets).

## Before opening a PR

- Run `npm run lint` and `npm run format` — the project uses ESLint + Prettier (with `prettier-plugin-organize-imports`).
- Run `npm run build` to confirm the production build succeeds.
- Keep changes scoped: one feature/fix per PR.
- If you add a new generation model, follow the pattern in `lib/models.ts` described in the README's "Adding New Models" section.

## Reporting bugs / requesting features

Use the issue templates under `.github/ISSUE_TEMPLATE/`.
