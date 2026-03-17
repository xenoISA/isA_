# =============================================================================
# isA_ Frontend — Multi-stage Production Dockerfile
# =============================================================================
# Build context: this directory (isA_/)
#
# The @isa/core and @isa/transport packages are referenced as file: deps in
# package.json. For Docker builds, the SDK packages must be available.
# Option A (default): Copy SDK packages into the build context before building.
#   mkdir -p .sdk/core .sdk/transport
#   cp -r ../isA_App_SDK/packages/core/* .sdk/core/
#   cp -r ../isA_App_SDK/packages/transport/* .sdk/transport/
# Option B: Publish packages to a registry and update package.json.
#
# Usage:
#   docker build -t isa-app .
#   docker run -p 4100:4100 --env-file deployment/environments/production.env isa-app
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy SDK packages (must be staged into .sdk/ before docker build)
COPY .sdk/core/ ./sdk/core/
COPY .sdk/transport/ ./sdk/transport/

# Copy package files with patched file: paths for containerised layout
COPY package.json package-lock.json ./

# Rewrite file: references to point to the staged SDK directories
RUN sed -i 's|"file:../isA_App_SDK/packages/core"|"file:./sdk/core"|g' package.json && \
    sed -i 's|"file:../isA_App_SDK/packages/transport"|"file:./sdk/transport"|g' package.json

RUN npm ci --ignore-scripts

# ---------------------------------------------------------------------------
# Stage 2: Build the Next.js application
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/sdk ./sdk
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
