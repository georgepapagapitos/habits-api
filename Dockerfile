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
# Fix punycode issue in Node.js 20
RUN npm install @tahul/punycode@2.3.4 -g

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
RUN npm ci --omit=dev --ignore-scripts
# Fix punycode issue in Node.js 20
RUN npm install @tahul/punycode@2.3.4 -g

# Copy build artifacts from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 5050

CMD ["node", "dist/server.js"]