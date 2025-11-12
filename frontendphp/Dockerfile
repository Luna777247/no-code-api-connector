# Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies using npm
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create .env.local for production with configurable API URL
# Use runtime environment variable with proper fallback
RUN echo "NEXT_PUBLIC_API_BASE_URL=\${NEXT_PUBLIC_API_BASE_URL:-http://localhost:8000}" > .env.local

# Switch to non-root user
USER nextjs

# Set default port using environment variable
ENV PORT=3000
EXPOSE $PORT

# Set environment variable at runtime (this will override the .env.local if set)
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL:-http://localhost:8000}

# Start the application
CMD ["npm", "start"]