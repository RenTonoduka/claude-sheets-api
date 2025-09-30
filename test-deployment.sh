#!/bin/bash

# Railway Deployment Test Script
# Usage: ./test-deployment.sh <RAILWAY_URL>

if [ -z "$1" ]; then
    echo "Usage: $0 <RAILWAY_URL>"
    echo "Example: $0 https://claude-sheets-api-production.up.railway.app"
    exit 1
fi

RAILWAY_URL="$1"
API_SECRET="claude-sheets-integration-secret-2024"

echo "🚂 Testing Railway Deployment: $RAILWAY_URL"
echo "=================================================="

# Test 1: Health Check
echo ""
echo "📋 Test 1: Health Check"
echo "GET $RAILWAY_URL/api/health"
curl -s "$RAILWAY_URL/api/health" | jq '.' || echo "Health check failed"

# Test 2: Claude Code API - Generate
echo ""
echo "📋 Test 2: Claude Code API - Generate"
echo "POST $RAILWAY_URL/api/claude-code"
curl -s -X POST "$RAILWAY_URL/api/claude-code" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_SECRET" \
  -H "X-Session-ID: test-railway-deploy" \
  -d '{
    "action": "generate",
    "prompt": "Create a simple JavaScript function that adds two numbers",
    "language": "javascript"
  }' | jq '.' || echo "Generate API failed"

# Test 3: CORS Headers Check
echo ""
echo "📋 Test 3: CORS Headers Check"
echo "OPTIONS $RAILWAY_URL/api/claude-code"
curl -s -I -X OPTIONS "$RAILWAY_URL/api/claude-code" \
  -H "Origin: https://script.google.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization"

echo ""
echo "=================================================="
echo "✅ Deployment test completed!"
echo ""
echo "Next steps:"
echo "1. Check if all tests passed"
echo "2. If Claude CLI authentication is needed, run:"
echo "   railway shell --project-id YOUR_PROJECT_ID"
echo "   claude auth"
echo "3. Proceed with Google Apps Script integration"