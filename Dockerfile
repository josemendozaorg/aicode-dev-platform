# Multi-stage build for optimized production image
FROM node:18-alpine AS base

# Install system dependencies for better security and performance
RUN apk add --no-cache \
    libc6-compat \
    dumb-init

# Create app directory and set permissions
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma/schema.prisma ./prisma/

# Development stage
FROM base AS development
ENV NODE_ENV=development
RUN npm ci --include=dev
COPY . .
RUN npm run db:generate
USER nodejs
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
ENV NODE_ENV=production
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run db:generate
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies and dumb-init
RUN apk add --no-cache \
    libc6-compat \
    dumb-init

# Create app directory and user
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./
COPY --from=build --chown=nodejs:nodejs /app/prisma ./prisma

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Security settings
RUN chmod -R 755 /app && \
    chmod -R 644 /app/dist && \
    chmod -R 600 /app/.env* || true

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node dist/healthcheck.js || exit 1

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]