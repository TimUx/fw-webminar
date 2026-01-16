FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY backend ./backend
COPY public ./public

# Create directories
RUN mkdir -p /data /uploads /slides /assets

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
