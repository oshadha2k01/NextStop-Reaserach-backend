FROM node:18-alpine

WORKDIR /app

# Copy only backend files
COPY package*.json ./
COPY backend/package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy backend source code
COPY backend/ .

# Expose port
EXPOSE ${PORT:-3000}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000), (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the server
CMD ["npm", "start"]

