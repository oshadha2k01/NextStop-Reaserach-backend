FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/

# Install dependencies
WORKDIR /app/backend
RUN npm install --omit=dev

# Copy backend source
COPY backend/ .

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "run", "start"]
