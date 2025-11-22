# Inspect360 - Deployment Guide

This guide will help you deploy Inspect360 to any server or hosting platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Required External Services](#required-external-services)
3. [Installation Steps](#installation-steps)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Building for Production](#building-for-production)
7. [Running in Production](#running-in-production)
8. [Deployment Platforms](#deployment-platforms)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js**: Version 20.x or higher
- **npm**: Version 10.x or higher
- **PostgreSQL**: Version 14 or higher (or a managed PostgreSQL service)
- **Storage**: At least 5GB for local file storage (more if expecting many uploads)
- **Memory**: Minimum 2GB RAM recommended

---

## Required External Services

Before deployment, you'll need API keys from these services:

### 1. PostgreSQL Database (REQUIRED)
**Recommended Providers:**
- [Neon](https://neon.tech) - Serverless PostgreSQL (Free tier available)
- [Supabase](https://supabase.com) - Open source Firebase alternative
- [Railway](https://railway.app) - Simple PostgreSQL hosting
- Self-hosted PostgreSQL

**What you need:**
- Database connection string (format: `postgresql://user:password@host:port/database`)

### 2. Stripe (REQUIRED for payments)
**Sign up at:** https://stripe.com

**What you need:**
- Secret Key (`sk_test_...` for testing, `sk_live_...` for production)
- Publishable Key (`pk_test_...` for testing, `pk_live_...` for production)
- Webhook Secret (from Stripe Dashboard → Developers → Webhooks)

**Setup steps:**
1. Create a Stripe account
2. Get your API keys from Dashboard → Developers → API keys
3. Set up a webhook endpoint at `https://yourdomain.com/api/stripe/webhook`
4. Copy the webhook signing secret

### 3. Resend (REQUIRED for email)
**Sign up at:** https://resend.com

**What you need:**
- API Key
- Verified sending domain

**Setup steps:**
1. Create a Resend account
2. Add and verify your domain (e.g., `yourdomain.com`)
3. Create an API key
4. Set your from email (e.g., `noreply@yourdomain.com`)

**Important:** Emails will fail until your domain is verified!

### 4. OpenAI (REQUIRED for AI features)
**Sign up at:** https://platform.openai.com

**What you need:**
- API Key

**Setup steps:**
1. Create an OpenAI account
2. Add billing information (usage-based pricing)
3. Generate an API key from API Keys section

**Note:** The application uses GPT-4 Vision for:
- Inspection photo analysis
- Comparison report generation
- Maintenance request triage
- AI chatbot responses

---

## Installation Steps

### 1. Download the Project

```bash
# If you received a ZIP file, extract it
unzip inspect360.zip
cd inspect360

# Or clone from repository
git clone <repository-url>
cd inspect360
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values
nano .env  # or use your preferred editor
```

See [Environment Configuration](#environment-configuration) section for details.

---

## Environment Configuration

Edit your `.env` file with the following required values:

```bash
# =============================================================================
# DATABASE (REQUIRED)
# =============================================================================
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# =============================================================================
# SESSION (REQUIRED)
# =============================================================================
# Generate a random secret:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your-generated-random-secret-here

# =============================================================================
# STRIPE (REQUIRED)
# =============================================================================
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# =============================================================================
# RESEND (REQUIRED)
# =============================================================================
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# =============================================================================
# OPENAI (REQUIRED)
# =============================================================================
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-openai-api-key

# =============================================================================
# SERVER (OPTIONAL)
# =============================================================================
PORT=5000
NODE_ENV=production

# =============================================================================
# STORAGE (OPTIONAL - defaults shown)
# =============================================================================
LOCAL_STORAGE_DIR=./storage
PRIVATE_OBJECT_DIR=private
PUBLIC_OBJECT_SEARCH_PATHS=public
```

---

## Database Setup

### 1. Create PostgreSQL Database

Using Neon (recommended):
```bash
# 1. Sign up at https://neon.tech
# 2. Create a new project
# 3. Copy the connection string
# 4. Add it to your .env file as DATABASE_URL
```

Or use any PostgreSQL provider and get the connection string.

### 2. Initialize Database Schema

```bash
# This will create all tables and schema
npm run db:push
```

If you get a warning about data loss, use:
```bash
npm run db:push --force
```

**Note:** The database migration system uses Drizzle ORM. Never manually write SQL migrations.

---

## Building for Production

### 1. Build the Application

```bash
npm run build
```

This will:
- Build the frontend (Vite) → `dist/public`
- Build the backend (esbuild) → `dist/index.js`

### 2. Test the Production Build

```bash
npm start
```

Visit `http://localhost:5000` to verify everything works.

---

## Running in Production

### Option 1: Using PM2 (Recommended)

PM2 is a production process manager for Node.js:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start npm --name "inspect360" -- start

# Save the PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# View logs
pm2 logs inspect360

# Monitor
pm2 monit
```

### Option 2: Using systemd (Linux)

Create `/etc/systemd/system/inspect360.service`:

```ini
[Unit]
Description=Inspect360 Application
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/inspect360
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable inspect360
sudo systemctl start inspect360
sudo systemctl status inspect360
```

### Option 3: Using Docker

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t inspect360 .
docker run -p 5000:5000 --env-file .env inspect360
```

---

## Deployment Platforms

### Railway

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Add environment variables: `railway variables set DATABASE_URL=...`
5. Deploy: `railway up`

### Render

1. Create a new Web Service
2. Connect your repository
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variables in dashboard

### DigitalOcean App Platform

1. Create a new app from GitHub/GitLab
2. Set build command: `npm run build`
3. Set run command: `npm start`
4. Add environment variables
5. Deploy

### AWS / Google Cloud / Azure

For cloud platforms, you'll want to:
1. Set up a VM (EC2, Compute Engine, Azure VM)
2. Install Node.js and npm
3. Clone the repository
4. Follow the [Running in Production](#running-in-production) section
5. Set up a reverse proxy (Nginx or Apache)
6. Configure SSL with Let's Encrypt

---

## Reverse Proxy Setup (Optional but Recommended)

### Using Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## File Storage

The application uses **local file system storage** by default. Files are stored in:
- `./storage/private/` - Private files (inspections, compliance docs)
- `./storage/public/` - Public files (if any)

### Important Notes:

1. **Ensure storage directory is writable:**
   ```bash
   mkdir -p storage/private storage/public
   chmod -R 755 storage
   ```

2. **Backup strategy:**
   - Set up regular backups of the `./storage` directory
   - Consider using `rsync` or cloud backup services

3. **For horizontal scaling:**
   - Use shared network storage (NFS, EFS, etc.)
   - Or migrate to Google Cloud Storage (GCS) - code is ready, just needs credentials

---

## Stripe Webhook Configuration

After deployment, configure your Stripe webhook:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set URL to: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the signing secret to `STRIPE_WEBHOOK_SECRET` in your `.env`

---

## Initial Setup After Deployment

### 1. Create Admin Account

The first user to register will need to be promoted to admin manually:

```bash
# Connect to your database and run:
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 2. Set Up Subscription Plans

1. Log in as admin
2. Navigate to Eco-Admin → Plans
3. Create your subscription plans and credit bundles
4. Link them to Stripe prices

### 3. Configure Email Templates

1. Navigate to Settings → Message Templates
2. Create templates for broadcast messages
3. Test email sending

---

## Monitoring and Logs

### Application Logs

If using PM2:
```bash
pm2 logs inspect360
```

If using systemd:
```bash
journalctl -u inspect360 -f
```

### Important Metrics to Monitor

- **Server CPU and Memory** - Should stay below 80%
- **Database connections** - Monitor connection pool
- **Storage space** - `./storage` directory growth
- **Email delivery** - Check Resend dashboard for failures
- **AI API usage** - Monitor OpenAI usage and costs

---

## Troubleshooting

### Database Connection Errors

```
Error: DATABASE_URL not found
```
**Solution:** Ensure `DATABASE_URL` is set in `.env`

### Email Sending Failures

```
Error: Resend not connected
```
**Solutions:**
1. Verify `RESEND_API_KEY` is set
2. Ensure domain is verified in Resend dashboard
3. Check `RESEND_FROM_EMAIL` matches verified domain

### Stripe Payment Issues

```
Error: Stripe credentials not configured
```
**Solutions:**
1. Set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`
2. Ensure webhook secret is correct
3. Verify webhook endpoint is accessible

### AI Features Not Working

```
Error: OpenAI integration not configured
```
**Solutions:**
1. Set `AI_INTEGRATIONS_OPENAI_API_KEY`
2. Set `AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1`
3. Verify OpenAI API key has credits

### Build Failures

```
Error: Cannot find module
```
**Solution:** Run `npm install` again

### Port Already in Use

```
Error: EADDRINUSE
```
**Solution:** Change `PORT` in `.env` or kill the process using port 5000

---

## Security Checklist

Before going live:

- [ ] Set strong `SESSION_SECRET` (32+ random characters)
- [ ] Use production Stripe keys (not test keys)
- [ ] Enable HTTPS (SSL certificate)
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable rate limiting (already built-in)
- [ ] Review CORS settings if needed
- [ ] Set `NODE_ENV=production`
- [ ] Don't commit `.env` file to version control
- [ ] Restrict database access to your server IP only
- [ ] Set up monitoring and alerts

---

## Backup Strategy

### Database Backups

```bash
# Backup PostgreSQL database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup-20231122.sql
```

### File Storage Backups

```bash
# Backup storage directory
tar -czf storage-backup-$(date +%Y%m%d).tar.gz storage/

# Restore
tar -xzf storage-backup-20231122.tar.gz
```

### Automated Backups

Set up a cron job:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/inspect360 && ./backup.sh
```

---

## Scaling Considerations

### Horizontal Scaling

To run multiple instances:

1. **Database:** Already supports multiple connections
2. **Session Store:** Currently uses in-memory - migrate to Redis for multi-instance
3. **File Storage:** Use shared storage (NFS) or migrate to Google Cloud Storage
4. **Load Balancer:** Use Nginx, HAProxy, or cloud load balancer

### Performance Optimization

- Enable caching for static assets
- Use CDN for frontend assets
- Optimize database queries
- Monitor and optimize AI API usage
- Consider PostgreSQL read replicas for reporting

---

## Support and Documentation

- **Project Documentation:** See `replit.md` for architecture details
- **API Documentation:** See `server/routes.ts` for all endpoints
- **Database Schema:** See `shared/schema.ts`
- **Frontend Components:** See `client/src/components/`

---

## Version Information

- **Node.js:** 20.x+
- **PostgreSQL:** 14+
- **Framework:** Express.js + React + Vite
- **ORM:** Drizzle ORM
- **Styling:** Tailwind CSS + Shadcn UI

---

## License

This project is proprietary software. See LICENSE file for details.

---

**Last Updated:** November 2024

For questions or issues during deployment, refer to the troubleshooting section or contact your development team.
