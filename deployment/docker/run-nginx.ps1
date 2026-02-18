# Nginx Docker Run Script for PowerShell
# This script runs nginx in Docker with proper configuration

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$NginxConf = Join-Path (Join-Path $ScriptDir "..") "nginx\nginx.docker.conf"

Write-Host "Starting Nginx in Docker..." -ForegroundColor Cyan
Write-Host "Configuration: $NginxConf"

# Check if nginx config exists
if (-not (Test-Path $NginxConf)) {
    Write-Host "Error: Nginx configuration file not found: $NginxConf" -ForegroundColor Red
    exit 1
}

# Stop existing container if running
$existing = docker ps -q -f name=blue-green-nginx
if ($existing) {
    Write-Host "Stopping existing nginx container..." -ForegroundColor Yellow
    docker stop blue-green-nginx
    docker rm blue-green-nginx
}

# Run nginx container
Write-Host "Running nginx container..." -ForegroundColor Green
$BuildBlue = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptDir)) "frontend\build-blue"
$BuildGreen = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptDir)) "frontend\build-green"

# Check if build directories exist
if (-not (Test-Path $BuildBlue)) {
    Write-Host "Warning: build-blue directory not found: $BuildBlue" -ForegroundColor Yellow
    Write-Host "You may need to build the frontend first: npm run build:blue" -ForegroundColor Yellow
}
if (-not (Test-Path $BuildGreen)) {
    Write-Host "Warning: build-green directory not found: $BuildGreen" -ForegroundColor Yellow
    Write-Host "You may need to build the frontend first: npm run build:green" -ForegroundColor Yellow
}

docker run -d `
    --name blue-green-nginx `
    -p 80:80 `
    -p 8080:8080 `
    -v "${NginxConf}:/etc/nginx/nginx.conf:rw" `
    -v "${BuildBlue}:/usr/share/nginx/html/build-blue:ro" `
    -v "${BuildGreen}:/usr/share/nginx/html/build-green:ro" `
    --add-host=host.docker.internal:host-gateway `
    --restart unless-stopped `
    nginx:alpine

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nNginx container started successfully!" -ForegroundColor Green
    Write-Host "Check status: docker ps | Select-String nginx" -ForegroundColor Cyan
    Write-Host "View logs: docker logs -f blue-green-nginx" -ForegroundColor Cyan
    Write-Host "Test: curl http://localhost:8080/health/blue" -ForegroundColor Cyan
} else {
    Write-Host "Failed to start nginx container" -ForegroundColor Red
    exit 1
}

