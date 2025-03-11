FROM node:20-alpine AS builder

# Set timezone to CST (America/Chicago)
ENV TZ=America/Chicago
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY .npmrc ./
RUN npm ci

# Copy source code and configuration files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

# Set timezone to CST (America/Chicago)
ENV TZ=America/Chicago
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
COPY .npmrc ./
ENV NODE_ENV=production
ENV NODE_NO_WARNINGS=1
RUN npm ci --omit=dev --ignore-scripts

# Copy build artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/ecosystem.config.js ./ecosystem.config.js

# Install PM2 globally for production
RUN npm install -g pm2

EXPOSE 5050

# Use PM2 in production for better process management
CMD ["pm2-runtime", "ecosystem.config.js"]