# Railway Deployment Guide

## Overview
This guide explains how to deploy the Claude Sheets API to Railway, a platform that supports Claude CLI installation and execution.

## Prerequisites
- Railway account
- Railway CLI installed
- Claude Pro subscription

## Deployment Steps

### 1. Login to Railway
```bash
railway login
```

### 2. Initialize Railway Project
```bash
railway init
```

### 3. Set Environment Variables
```bash
# API Secret
railway variables set VERCEL_API_SECRET=claude-sheets-integration-secret-2024

# Claude Configuration
railway variables set CLAUDE_AUTH_METHOD=subscription
railway variables set CLAUDE_MODEL=claude-3-sonnet-20240229

# Rate Limiting
railway variables set RATE_LIMIT_WINDOW_MS=60000
railway variables set RATE_LIMIT_MAX_REQUESTS=60
railway variables set RATE_LIMIT_SKIP_SUCCESS=false

# Security
railway variables set ALLOWED_ORIGINS="https://script.google.com,https://docs.google.com"
railway variables set CORS_CREDENTIALS=true

# Application
railway variables set APP_NAME=Claude-Sheets-Integration
railway variables set APP_VERSION=1.0.0
railway variables set LOG_LEVEL=info
railway variables set NODE_ENV=production
railway variables set PORT=3000
```

### 4. Deploy
```bash
railway up
```

## Post-Deployment

### 1. Authenticate Claude CLI
After deployment, you'll need to SSH into the Railway container to authenticate Claude CLI:

```bash
railway shell
claude auth
```

### 2. Test Deployment
```bash
# Health check
curl https://your-app.railway.app/api/health

# API test
curl -X POST https://your-app.railway.app/api/claude-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer claude-sheets-integration-secret-2024" \
  -d '{"action":"generate","prompt":"Create a hello world function","language":"javascript"}'
```

## Configuration Files

- `Dockerfile`: Installs Node.js, Claude CLI, and builds the application
- `railway.json`: Railway-specific configuration
- `.env.production`: Production environment variables template

## Architecture

```
Google Sheets → GAS → Railway (Next.js + Claude CLI) → Claude AI
```

## Troubleshooting

### Claude CLI Authentication Issues
1. SSH into Railway container: `railway shell`
2. Run authentication: `claude auth`
3. Follow the interactive prompts

### Environment Variables
- Check variables are set: `railway variables`
- Update if needed: `railway variables set KEY=value`

### Logs
- View logs: `railway logs`
- Follow logs: `railway logs --follow`

## Security Notes

- All API endpoints require Bearer token authentication
- CORS is configured for Google Apps Script origins only
- Rate limiting is enabled (60 requests per minute)
- Claude CLI runs in isolated container environment