# Quick Start Guide

Get helthscore running in 5 minutes! 🚀

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Environment

Copy the example environment file:

```bash
cp env.example .env.local
```

**Optional**: Add AI API keys for enhanced scoring:

- Get OpenAI key: https://platform.openai.com/api-keys
- Get xAI key: https://x.ai/

## 3. Start Development Server

```bash
npm run dev
```

## 4. Open Your Browser

Navigate to [http://localhost:3000](http://localhost:3000)

## 5. Test the App

1. **Allow camera access** when prompted
2. **Point at a barcode** (any food product)
3. **View health score** and analysis
4. **Toggle AI enhancement** if you added API keys

## Test the API

Run the test script to verify everything works:

```bash
npm run test:api
```

## What You'll See

- **Real-time barcode scanning** with your device camera
- **Instant health scores** from 1-10
- **Detailed pros and cons** for each product
- **AI-enhanced insights** (if API keys configured)
- **Voice feedback** for accessibility

## Troubleshooting

**Camera not working?**

- Ensure you're on HTTPS (required for camera access)
- Check browser permissions
- Try refreshing the page

**AI not working?**

- Verify API keys in `.env.local`
- Check the test script output

**Need help?**

- Check the full [README.md](README.md)
- Look at the troubleshooting section

## Next Steps

- Customize the scoring algorithm in `lib/scoring.ts`
- Add new UI components in `components/`
- Deploy to Vercel for production use
- Integrate with additional data sources

Happy scanning! 📱✨
