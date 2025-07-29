#!/bin/bash

# Deploy fix for trust proxy and rate limiting issues
echo "🚀 Deploying production fixes..."

# Add all changes
git add .

# Commit the changes
git commit -m "Fix production deployment: Enable trust proxy, handle Redis failures, improve rate limiting

- Enable trust proxy automatically in production environment
- Add graceful error handling for rate limiting configuration
- Fix trust proxy validation for express-rate-limit
- Add Redis connection error handling
- Skip rate limiting for health check endpoints
- Improve logging for debugging production issues"

# Push to trigger deployment
git push origin main

echo "✅ Changes pushed! Monitor deployment at https://okaycaleb.onrender.com/"
echo "📊 Check logs in Render dashboard for deployment status"
echo "🔍 Test endpoints once deployment completes"
