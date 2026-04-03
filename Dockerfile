# =============================================================================
# isA_ Frontend — Multi-stage Production Dockerfile
# =============================================================================
# Build context: this directory (isA_/)
#
# SDK packages (@isa/core, @isa/transport, @isa/ui-web) are installed from
# GitHub Packages. The .npmrc at the project root configures the @xenoisa
# registry scope. Pass NPM_TOKEN as a build arg for private registry auth.
#
# Usage:
#   docker build --build-arg NPM_TOKEN=$NPM_TOKEN -t isa-app .
#   docker run -p 4100:4100 --env-file deployment/environments/production.env isa-app
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Registry auth for @xenoisa packages from GitHub Packages
ARG NPM_TOKEN
COPY .npmrc .npmrc

# Copy package files
COPY package.json package-lock.json ./

RUN npm ci --ignore-scripts

# Remove .npmrc after install (don't leak token into later stages)
RUN rm -f .npmrc

# ---------------------------------------------------------------------------
# Stage 2: Build the Next.js application
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./

# Copy application source
COPY next.config.js tsconfig.json postcss.config.js tailwind.config.js ./
COPY src/ ./src/
COPY pages/ ./pages/
COPY styles/ ./styles/
COPY public/ ./public/

# Build-time env vars (NEXT_PUBLIC_* must be present at build time)
ARG NEXT_PUBLIC_APP_ENV=production
ARG NEXT_PUBLIC_GATEWAY_URL=http://localhost:9080
ARG NEXT_TELEMETRY_DISABLED=1

ENV NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED}

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: Production runtime (minimal image)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only what's needed to run
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 4100

ENV PORT=4100
ENV HOSTNAME="0.0.0.0"

# Use dumb-init to handle PID 1 and signal forwarding
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
