# Quick Start: Nginx with Docker

## Prerequisites
- Docker installed and running
- Backend services running on host (ports 5000, 5001)
- Frontend running on host (port 3000)

## Quick Start (Windows PowerShell)

```powershell
# Navigate to project root
cd D:\Capstone

# Run nginx in Docker
.\deployment\docker\run-nginx.ps1
```

## Quick Start (Linux/Mac)

```bash
# Navigate to project root
cd /path/to/Capstone

# Make script executable
chmod +x deployment/docker/run-nginx.sh

# Run nginx in Docker
./deployment/docker/run-nginx.sh
```

## Quick Start (Docker Compose)

```bash
# Navigate to deployment/docker
cd deployment/docker

# Start nginx
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Verify It's Working

```bash
# Check container is running
docker ps | grep nginx

# Test health endpoints
curl http://localhost:8080/health/blue
curl http://localhost:8080/health/green

# Test main endpoint
curl http://localhost:80/health
```

## Access Your Application

- **Main Application**: http://localhost:80
- **Health Check (Blue)**: http://localhost:8080/health/blue
- **Health Check (Green)**: http://localhost:8080/health/green

## Stop Nginx

```bash
# Stop container
docker stop blue-green-nginx

# Remove container
docker rm blue-green-nginx

# Or with docker-compose
cd deployment/docker
docker-compose down
```

## Troubleshooting

### Port 80 already in use
```bash
# Windows: Find what's using port 80
netstat -ano | findstr :80

# Linux/Mac: Find what's using port 80
lsof -i :80

# Stop the service or use different port
```

### Cannot connect to backend
- Ensure backend services are running on host
- For Windows/Mac: Docker Desktop must be running
- Check `host.docker.internal` is accessible

### Configuration not updating
```bash
# Reload nginx in container
docker exec blue-green-nginx nginx -s reload

# Or restart container
docker restart blue-green-nginx
```

## Next Steps

1. Start your backend services:
   ```bash
   npm run dev:blue    # Terminal 1
   npm run dev:green   # Terminal 2
   ```

2. Start your frontend:
   ```bash
   cd frontend && npm start
   ```

3. Start nginx in Docker:
   ```bash
   .\deployment\docker\run-nginx.ps1   # Windows
   # or
   ./deployment/docker/run-nginx.sh    # Linux/Mac
   ```

4. Access application at http://localhost:80

For detailed setup, see [deployment/docker/NGINX_DOCKER_SETUP.md](./deployment/docker/NGINX_DOCKER_SETUP.md)

