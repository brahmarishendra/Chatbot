# MindBuddy Deployment Guide

## ⚠️ Resolving "Using fallback mode" Issue

The "Using fallback mode" warning appears when the OpenAI API key is not properly configured. Here's how to fix it:

### For Local Development:

1. **Set up your API key in `.env` file:**
   ```bash
   # Edit the .env file in the langgraph-agent directory
   OPENAI_API_KEY=your_actual_openai_api_key_here
   ```

2. **Get your OpenAI API key:**
   - Visit: https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key and replace `your_openai_api_key_here` in `.env`

### For Render Deployment:

1. **Set Environment Variables in Render Dashboard:**
   - Go to your Render service dashboard
   - Navigate to "Environment" section
   - Add the following environment variables:
     ```
     OPENAI_API_KEY=your_actual_openai_api_key_here
     OPENAI_MODEL=gpt-3.5-turbo
     OPENAI_TEMPERATURE=0.8
     OPENAI_MAX_TOKENS=1000
     NODE_ENV=production
     PORT=3003
     HOST=0.0.0.0
     ```

2. **Verify Deployment:**
   - Check the health endpoint: `https://your-app.onrender.com/health`
   - Look for `"fallback_mode": false` in the response
   - Check `"api_configured": true` status

### Health Check Endpoints:

- **Basic Health**: `GET /`
- **Detailed Health**: `GET /health`
- **API Status**: `GET /api/status`
- **API Key Test**: `GET /api/test-key`

### Expected Responses:

**When properly configured:**
```json
{
  "status": "healthy",
  "fallback_mode": false,
  "api_configured": true,
  "deployment_ready": true,
  "powered_by": "OpenAI ChatGPT API"
}
```

**When in fallback mode:**
```json
{
  "status": "degraded",
  "fallback_mode": true,
  "api_configured": false,
  "warnings": ["API key not configured - running in degraded mode"]
}
```

### Troubleshooting:

1. **Check environment variables are loaded:**
   - Look at server startup logs
   - Verify "✅ All required environment variables are set" message

2. **API key validation:**
   - Ensure the API key is valid and active
   - Check Google Cloud Console for quota and billing

3. **Deployment platform:**
   - For Render: Set environment variables in dashboard
   - For other platforms: Configure according to their documentation

### Security Notes:

- Never commit `.env` files to git (already in .gitignore)
- Use platform-specific environment variable configuration for production
- Monitor API usage and set appropriate quotas