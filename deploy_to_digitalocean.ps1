# ============================================================
# Deploy to DigitalOcean - offer-editor
# Server: root@139.59.32.39
# ============================================================

$SERVER = "root@139.59.32.39"
$REMOTE_DIR = "/var/www/offer-editor"
$LOCAL_DIR = "D:\offer_editer"

Write-Host "=== Step 1: Packaging deploy.tar.gz ===" -ForegroundColor Cyan

Set-Location $LOCAL_DIR

# Create tar.gz with backend + frontend/dist + ecosystem config (exclude node_modules)
wsl tar -czf deploy.tar.gz `
    --exclude='./frontend/node_modules' `
    --exclude='./backend/node_modules' `
    --exclude='./.git' `
    --exclude='./frontend/.git' `
    --exclude='./backend/.git' `
    --exclude='./frontend/src' `  
    --exclude='./deploy.tar.gz' `
    --exclude='./backend.zip' `
    --exclude='./frontend.zip' `
    ./backend `
    ./frontend/dist `
    ./ecosystem.config.cjs

Write-Host "✓ deploy.tar.gz created" -ForegroundColor Green

Write-Host ""
Write-Host "=== Step 2: Uploading to DigitalOcean ===" -ForegroundColor Cyan

# Upload the tar.gz
scp -i "$env:USERPROFILE\.ssh\id_ed25519" deploy.tar.gz "${SERVER}:${REMOTE_DIR}/"

Write-Host "✓ Uploaded deploy.tar.gz" -ForegroundColor Green

Write-Host ""
Write-Host "=== Step 3: Run these commands on the server ===" -ForegroundColor Yellow
Write-Host @"

ssh root@139.59.32.39

# On the server, run:
cd /var/www/offer-editor
tar -xzf deploy.tar.gz
cd backend && npm install --production
cd ..
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

"@
