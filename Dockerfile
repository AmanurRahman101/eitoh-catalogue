FROM node:20-alpine

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application backend and frontend
COPY backend ./backend
COPY frontend ./frontend

# Expose default port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

# Start application server
CMD ["node", "backend/index.js"]
