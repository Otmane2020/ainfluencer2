# ClipMotion Video Service - FFmpeg + Node.js
FROM node:20-slim

# Install FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first (for layer caching)
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY index.js ./

# Expose port (Railway injects $PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start service
CMD ["node", "index.js"]
