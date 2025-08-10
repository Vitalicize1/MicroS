# 🚀 Setting Up Gemini API (Free Tier)

## Why Gemini?

- **Free Tier**: 15 requests per minute, 1M characters per minute
- **No Credit Card Required**: Unlike OpenAI
- **High Quality**: Google's latest AI model
- **Easy Setup**: Simple API key generation

## Step-by-Step Setup

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key (starts with `AIza...`)

### 2. Update Your Environment

Edit your `.env` file:

```bash
# Replace the placeholder with your actual API key
GEMINI_API_KEY=AIzaSyYourActualApiKeyHere
LLM_PROVIDER=gemini
```

### 3. Test the Setup

Run the test script to verify everything works:

```bash
python3 run.py
```

You should see the agent using Gemini for intent classification instead of fallback mode.

## API Key Security

- **Never commit your API key** to version control
- **Keep your `.env` file** in `.gitignore`
- **Rotate keys** if they get exposed

## Free Tier Limits

- **15 requests per minute** (900 per hour)
- **1M characters per minute**
- **No daily/monthly limits** on the free tier

## Troubleshooting

### "API key not set" error
- Make sure you've added your Gemini API key to `.env`
- Check that the key starts with `AIza`

### "Invalid API key" error
- Verify the key is copied correctly from Google AI Studio
- Make sure there are no extra spaces or characters

### Rate limiting
- The free tier has 15 requests per minute
- If you hit the limit, wait a minute and try again

## Switching Between Providers

You can easily switch between OpenAI and Gemini:

```bash
# Use Gemini (free)
LLM_PROVIDER=gemini

# Use OpenAI (paid)
LLM_PROVIDER=openai
```

## Cost Comparison

| Provider | Free Tier | Paid Tier |
|----------|-----------|-----------|
| **Gemini** | ✅ 15 req/min | $0.0005/1M tokens |
| **OpenAI** | ❌ None | $0.0025/1M tokens |

Gemini is significantly cheaper and has a generous free tier!
