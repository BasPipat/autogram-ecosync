# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build time if needed
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyBfwbqpTooEUNwaGcnuGjYU-sTbGqutKb4"
ENV NEXT_PUBLIC_LINE_LIFF_ID="2010054204-bv5oRtcL"
ENV NEXT_PUBLIC_PUSHER_CLUSTER="ap1"
ENV NEXT_PUBLIC_PUSHER_KEY="962b0ef0f196539fac89"
ENV NEXT_PUBLIC_APP_URL="https://eco-sync-web-479170608103.asia-southeast1.run.app"

RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
CMD ["node", "server.js"]
