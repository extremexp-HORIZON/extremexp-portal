# Stage 1: Build static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Only copy manifest files first to leverage Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy the rest of the source
COPY . .

# Build the production bundle (Vite outputs to dist/ by default)
RUN npm run build

# Stage 2: Lightweight runtime image
FROM node:20-alpine AS runtime
WORKDIR /app

# Install only a tiny HTTP static server (serve)
RUN npm install -g serve && npm cache clean --force

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

EXPOSE 7001

# Use serve to host the static files
CMD ["serve", "-s", "dist", "-l", "7001"]
