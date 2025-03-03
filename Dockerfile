FROM node:20-alpine AS builder

# Set timezone to CST (America/Chicago)
ENV TZ=America/Chicago
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
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
ENV NODE_ENV=production
RUN npm ci --omit=dev --ignore-scripts

# Copy build artifacts from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 5050

CMD ["node", "dist/server.js"]