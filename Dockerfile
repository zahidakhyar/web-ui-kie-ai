FROM node:22-alpine AS deps

ARG KIE_API_KEY
ENV KIE_API_KEY=$KIE_API_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ARG DATABASE_PATH
ENV DATABASE_PATH=$DATABASE_PATH
ARG R2_ACCOUNT_ID
ENV R2_ACCOUNT_ID=$R2_ACCOUNT_ID
ARG R2_ACCESS_KEY_ID
ENV R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID
ARG R2_SECRET_ACCESS_KEY
ENV R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY
ARG R2_BUCKET_NAME
ENV R2_BUCKET_NAME=$R2_BUCKET_NAME
ARG R2_PUBLIC_URL
ENV R2_PUBLIC_URL=$R2_PUBLIC_URL

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ─── Builder ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ─── Runner ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Migration assets
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=deps    /app/node_modules ./node_modules

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
