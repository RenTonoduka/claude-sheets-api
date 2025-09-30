# 🚂 Railway Deployment Instructions

## Current Status
- ✅ GitHub Repository: https://github.com/RenTonoduka/claude-sheets-api
- ✅ Railway CLI: Logged in as tonoduka@markx.co.jp
- ✅ All deployment files ready

## Option 1: Railway Web UI Deployment (Recommended)

### Step 1: Create New Project
1. Go to **https://railway.app/dashboard**
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose **"RenTonoduka/claude-sheets-api"**
5. Click **"Deploy Now"**

### Step 2: Configure Environment Variables
In Railway Dashboard → Variables tab, add:
```
VERCEL_API_SECRET=claude-sheets-integration-secret-2024
CLAUDE_AUTH_METHOD=subscription
CLAUDE_MODEL=claude-3-sonnet-20240229
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
RATE_LIMIT_SKIP_SUCCESS=false
ALLOWED_ORIGINS=https://script.google.com,https://docs.google.com
CORS_CREDENTIALS=true
APP_NAME=Claude-Sheets-Integration
APP_VERSION=1.0.0
LOG_LEVEL=info
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1
```

### Step 3: Wait for Deployment
- Railway will automatically build using the Dockerfile
- Build time: ~5-10 minutes
- Watch build logs in Railway dashboard

### Step 4: Get URL and Test
1. Copy the generated Railway URL (e.g., `https://your-app.railway.app`)
2. Run test script:
```bash
./test-deployment.sh https://your-app.railway.app
```

### Step 5: Authenticate Claude CLI
1. In Railway dashboard, click **"Connect"** → **"Command Line"**
2. Run: `claude auth`
3. Follow authentication prompts

## Option 2: Railway CLI Deployment (If Interactive Terminal Available)

If you have access to an interactive terminal:

```bash
# Initialize project (requires interactive selection)
railway init

# Link to the created project
railway link

# Set environment variables
railway variables set VERCEL_API_SECRET=claude-sheets-integration-secret-2024
railway variables set CLAUDE_AUTH_METHOD=subscription
railway variables set NODE_ENV=production
# ... (add all variables from RAILWAY_ENV_VARS.txt)

# Deploy
railway up
```

## Expected Build Process

1. **Dockerfile execution**:
   - Install Node.js 18
   - Install Claude CLI
   - Install npm dependencies
   - Build Next.js app

2. **Service startup**:
   - Run `npm start`
   - Listen on port 3000
   - Health check at `/api/health`

## Post-Deployment Verification

### Health Check
```bash
curl https://your-app.railway.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "claude-cli": "available",
    "rate-limiter": "operational",
    "auth": "operational"
  }
}
```

### API Test
```bash
curl -X POST https://your-app.railway.app/api/claude-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer claude-sheets-integration-secret-2024" \
  -d '{"action":"generate","prompt":"Hello world function","language":"javascript"}'
```

## Troubleshooting

### Build Failures
- Check Railway build logs
- Verify Dockerfile syntax
- Ensure all dependencies in package.json

### Claude CLI Issues
- SSH into container: Railway dashboard → Connect → Command Line
- Run: `claude auth`
- Check: `claude --version`

### Environment Variables
- Verify all variables are set in Railway dashboard
- Check case sensitivity
- Ensure no extra spaces

### API Errors
- Check service logs in Railway dashboard
- Verify API secret matches
- Test CORS headers with OPTIONS request

## Next Steps After Successful Deployment

1. ✅ Railway deployment working
2. 🔄 Google Apps Script integration
3. 📊 End-to-end testing with Google Sheets
4. 📈 Performance monitoring

## Support Files

- `Dockerfile`: Container configuration
- `railway.json`: Railway settings
- `test-deployment.sh`: Automated testing
- `RAILWAY_ENV_VARS.txt`: Environment variables list