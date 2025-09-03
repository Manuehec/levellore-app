# Dockerfile for LevelLore web app
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy server package.json and install dependencies
COPY server/package.json ./server/
RUN cd server && npm install --production

# Copy application code
COPY server ./server
COPY client ./client

# Expose port for Express server
EXPOSE 3000

# Start the Node.js server
CMD ["node", "server/server.js"]
