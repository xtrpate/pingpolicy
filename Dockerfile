# syntax=docker/dockerfile:1
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start command
CMD ["npm", "start"]
