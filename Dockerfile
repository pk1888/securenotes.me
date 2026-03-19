# Production Dockerfile for securenotes.me
# Uses Debian for better SQLCipher/OpenSSL compatibility

FROM node:20-bullseye AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code (excluding node_modules via .dockerignore)
COPY . .

# Build the frontend
RUN npm run build

# Production stage
FROM node:20-bullseye AS production

# Install SQLCipher and OpenSSL dependencies
RUN apt-get update && apt-get install -y \
    libssl-dev \
    pkg-config \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server.ts ./
COPY tsconfig.json ./

# Create data directory for persistent SQLite storage
RUN mkdir -p /app/data

# Install tsx for running TypeScript in production
RUN npm install -g tsx

# Expose port
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["tsx", "server.ts"]
