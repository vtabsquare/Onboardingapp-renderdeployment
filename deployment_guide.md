# DigitalOcean Deployment Guide

This guide provides instructions for deploying the Offer Editor application to your DigitalOcean server.

## 1. Server Preparation

SSH into your server:
```bash
ssh root@139.59.32.39
```

Install Node.js (LTS), PM2, and Nginx:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo npm install -g pm2
```

## 2. Environment Variables

Create a `.env` file in the `backend` directory of your server with the following variables:
```env
MONGO_URI=your_mongodb_connection_string
PORT=5050
JWT_SECRET=your_jwt_secret
# Add any other variables from your Render environment
```

## 3. Nginx Configuration

Create a new Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/offergenerator.vtabsquare.com
```

Paste the following configuration (replace placeholders if necessary):
```nginx
server {
    server_name offergenerator.vtabsquare.com;

    location /api {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /var/www/offer-editor/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

Enable the configuration and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/offergenerator.vtabsquare.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo system refreshing nginx
```

## 4. SSL Setup (Certbot)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d offergenerator.vtabsquare.com
```

## 5. Deployment

1.  Upload your code to `/var/www/offer-editor` on the server.
2.  Install dependencies:
    ```bash
    cd /var/www/offer-editor/backend && npm install
    cd /var/www/offer-editor/frontend && npm install && npm run build
    ```
3.  Start the backend with PM2:
    ```bash
    cd /var/www/offer-editor
    pm2 start ecosystem.config.cjs
    pm2 save
    ```
