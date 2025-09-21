# LangGraph Agent

This project demonstrates a LangGraph agent using LangChain and Tavily search tools.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add your API keys in the `agent.mts` file:
   - Replace `sk-abcdef1234567890abcdef1234567890abcdef12` with your actual OpenAI API key
   - Replace `tvly-...` with your actual Tavily API key

## Running the Agent

```bash
npm start
```

## What it does

The agent:
1. Uses Tavily search to find current weather information
2. Maintains conversation memory across interactions
3. Demonstrates multi-turn conversations by asking about weather in SF, then NY
4. Includes graph visualization capabilities (requires Jupyter notebook environment)

## Files

- `agent.mts` - Main agent implementation
- `package.json` - Project dependencies and scripts  
- `tsconfig.json` - TypeScript configuration
- `README.md` - This file

## API Keys Required

- OpenAI API key for the language model
- Tavily API key for web search functionality

Make sure to get these keys from:
- OpenAI: https://platform.openai.com/api-keys
- Tavily: https://tavily.com/