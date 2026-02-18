#!/bin/bash

# Nginx Docker Run Script
# This script runs nginx in Docker with proper configuration

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
NGINX_CONF="$SCRIPT_DIR/../nginx/nginx.docker.conf"

echo "Starting Nginx in Docker..."
echo "Configuration: $NGINX_CONF"

# Check if nginx config exists
if [ ! -f "$NGINX_CONF" ]; then
    echo "Error: Nginx configuration file not found: $NGINX_CONF"
    exit 1
fi

# Stop existing container if running
if [ "$(docker ps -q -f name=blue-green-nginx)" ]; then
    echo "Stopping existing nginx container..."
    docker stop blue-green-nginx
    docker rm blue-green-nginx
fi

BUILD_BLUE="$SCRIPT_DIR/../../frontend/build-blue"
BUILD_GREEN="$SCRIPT_DIR/../../frontend/build-green"

# Check if build directories exist
if [ ! -d "$BUILD_BLUE" ]; then
    echo "Warning: build-blue directory not found: $BUILD_BLUE"
    echo "You may need to build the frontend first: npm run build:blue"
fi
if [ ! -d "$BUILD_GREEN" ]; then
    echo "Warning: build-green directory not found: $BUILD_GREEN"
    echo "You may need to build the frontend first: npm run build:green"
fi

# Determine OS and run accordingly
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - use host network
    echo "Running on Linux with host network..."
    docker run -d \
        --name blue-green-nginx \
        --network host \
        -v "$NGINX_CONF:/etc/nginx/nginx.conf:rw" \
        -v "$BUILD_BLUE:/usr/share/nginx/html/build-blue:ro" \
        -v "$BUILD_GREEN:/usr/share/nginx/html/build-green:ro" \
        --restart unless-stopped \
        nginx:alpine
else
    # Windows/Mac - use host.docker.internal
    echo "Running on Windows/Mac with host.docker.internal..."
    docker run -d \
        --name blue-green-nginx \
        -p 80:80 \
        -p 8080:8080 \
        -v "$NGINX_CONF:/etc/nginx/nginx.conf:rw" \
        -v "$BUILD_BLUE:/usr/share/nginx/html/build-blue:ro" \
        -v "$BUILD_GREEN:/usr/share/nginx/html/build-green:ro" \
        --add-host=host.docker.internal:host-gateway \
        --restart unless-stopped \
        nginx:alpine
fi

echo "Nginx container started!"
echo "Check status: docker ps | grep nginx"
echo "View logs: docker logs -f blue-green-nginx"
echo "Test: curl http://localhost:8080/health/blue"

