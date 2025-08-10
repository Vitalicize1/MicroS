# 🔑 USDA FoodData Central API Setup

Your nutrition app now has access to **thousands of foods** via the USDA FoodData Central API!

## 🚀 Current Status
- ✅ **DEMO_KEY** is working and providing food search results
- ✅ **20+ tofu varieties** found in search
- ✅ **Hybrid search** combines local database + USDA API
- ✅ **Fallback system** works if USDA API is down

## 🔧 Get Full Access (Recommended)

The `DEMO_KEY` has limitations. For full nutrition data and higher rate limits:

1. **Sign up for free**: https://fdc.nal.usda.gov/api-key-signup.html
2. **Get your API key** (takes 1-2 minutes)
3. **Update your .env file**:
   ```bash
   USDA_API_KEY=your_real_api_key_here
   ```
4. **Restart your Flask server**

## 📊 What You Get

### With DEMO_KEY (Current):
- ✅ Food search results
- ✅ Food names and brands  
- ⚠️ Limited nutrition data
- ⚠️ 30 requests/hour limit

### With Real API Key:
- ✅ **Complete nutrition data** (calories, protein, vitamins, minerals)
- ✅ **1,000 requests/hour** limit
- ✅ **Detailed ingredient lists**
- ✅ **Multiple data sources** (Branded, Foundation, Survey)

## 🔍 Search Features Now Available

Your users can now search for:
- **Specific brands**: "Nasoya tofu", "Trader Joe's chicken"
- **Generic foods**: "tofu", "chicken breast", "spinach"
- **Variations**: Different cuts, preparations, and brands
- **Thousands of foods** from the USDA database

## 🎯 Example Searches That Now Work

Try these in your app:
- `tofu` → 20+ varieties (Nasoya, House Foods, etc.)
- `chicken breast` → Multiple preparations and brands
- `quinoa` → Different types and brands
- `greek yogurt` → Various brands and flavors
- `almond butter` → Different brands and varieties

## 🔄 How It Works

1. **Local First**: Searches your local database (fast)
2. **USDA API**: Searches comprehensive USDA database
3. **Combined Results**: Shows both local + USDA foods
4. **Source Labels**: USDA foods are marked with blue "USDA" badge
5. **Fallback**: If USDA API fails, shows local results only

Your nutrition app now has access to one of the world's most comprehensive food databases! 🎉
