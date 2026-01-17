FROM node:20-alpine

WORKDIR /app

# Install poppler-utils for PDF to image conversion (pdftoppm)
RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community poppler-utils

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application files
COPY backend ./backend
COPY public ./public

# Create directories
RUN mkdir -p /app/data /app/uploads /app/slides /app/assets

# Expose port
EXPOSE 3000

# Start application directly with node (not npm) to properly handle SIGTERM
CMD ["node", "backend/server.js"]
