FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY backend ./backend
COPY public ./public

# Create directories with proper permissions
RUN mkdir -p /data /uploads /slides /assets && \
    chown -R node:node /app /data /uploads /slides /assets

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
