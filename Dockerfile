FROM node:20-alpine

WORKDIR /app

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

# Start application
CMD ["npm", "start"]
