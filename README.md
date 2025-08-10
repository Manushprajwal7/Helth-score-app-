# Live Health Scorer

A real-time health scoring application for food products that uses barcode scanning and AI enhancement to provide comprehensive nutritional assessments.

## Features

- **Real-time Barcode Scanning**: Use your device's camera to scan product barcodes
- **Instant Health Scoring**: Get health scores from 1-10 with detailed pros and cons
- **AI Enhancement**: Optional AI-powered analysis using OpenAI GPT-4o or xAI Grok-3
- **Voice Synthesis**: Audio feedback for accessibility and hands-free use
- **Comprehensive Analysis**: Combines Nutri-Score, NOVA classification, ingredients, and more
- **Privacy-First**: Camera frames never leave your device, only barcode numbers are sent

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **AI Integration**: AI SDK with OpenAI and xAI support
- **Barcode Detection**: Native BarcodeDetector API + ZXing fallback
- **Data Source**: Open Food Facts API (public database)

## Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Camera-enabled device (for scanning functionality)
- AI API keys (optional, for enhanced scoring)

## Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd live-health-scorer
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   Copy the example environment file:

   ```bash
   cp env.example .env.local
   ```

   Edit `.env.local` and add your AI API keys:

   ```env
   # AI API Keys (at least one is required for AI enhancement)
   OPENAI_API_KEY=your_openai_api_key_here
   XAI_API_KEY=your_xai_api_key_here

   # App Configuration
   NEXT_PUBLIC_APP_NAME="Live Health Scorer"
   NEXT_PUBLIC_APP_DESCRIPTION="Real-time health scoring for food products"

   # Open Food Facts API (public, no key needed)
   NEXT_PUBLIC_OFF_API_BASE_URL=https://world.openfoodfacts.org/api/v2

   # Development Settings
   NODE_ENV=development
   NEXT_TELEMETRY_DISABLED=1
   ```

4. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Getting AI API Keys

### OpenAI

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env.local` file

### xAI (Grok)

1. Visit [xAI](https://x.ai/)
2. Sign up for API access
3. Generate an API key
4. Copy the key to your `.env.local` file

## Usage

### Basic Scanning

1. **Enable Camera**: Allow camera access when prompted
2. **Point at Barcode**: Align the product barcode within the scanning frame
3. **View Results**: Get instant health score and analysis
4. **Toggle AI**: Enable AI enhancement for richer insights

### Controls

- **Camera Toggle**: Switch between front and back cameras
- **Scan Pause/Resume**: Control scanning activity
- **Voice Settings**: Adjust speech rate and pitch
- **AI Enhancement**: Toggle AI-powered analysis

### Understanding Scores

**Score Ranges:**

- **8.5-10**: Excellent - Very healthy choice
- **7-8.4**: Good - Healthy option
- **5.5-6.9**: Fair - Moderate health impact
- **4-5.4**: Poor - Limited health benefits
- **1-3.9**: Very Poor - Not recommended

**Scoring Factors:**

- **Nutrition (40%)**: Nutri-Score, macros, fiber, protein
- **Processing (25%)**: NOVA classification (1-4)
- **Ingredients (20%)**: Additives, allergens, artificial ingredients
- **Labels (15%)**: Organic, vegan, gluten-free certifications

## API Endpoints

### `/api/ai-score`

- **POST**: Submit product data for AI enhancement
- **OPTIONS**: Check AI availability

**Request Body:**

```json
{
  "product": {
    "product_name": "Product Name",
    "brands": "Brand",
    "categories": "Category",
    "ingredients_text": "Ingredients...",
    "nutriments": {},
    "nutriscore_grade": "A",
    "nova_group": 1,
    "additives_tags": [],
    "labels_tags": []
  },
  "baseScore": 8.5,
  "basePros": ["Low sugar", "High fiber"],
  "baseCons": ["Contains additives"]
}
```

## Development

### Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   ├── camera-scanner.tsx # Barcode scanning
│   ├── score-gauge.tsx    # Health score display
│   └── ...
├── lib/                    # Utility functions
│   ├── open-food-facts.ts # API integration
│   ├── scoring.ts         # Health scoring algorithm
│   └── utils.ts           # Helper functions
├── hooks/                  # Custom React hooks
└── public/                 # Static assets
```

### Key Components

- **CameraScanner**: Handles camera access and barcode detection
- **ScoreGauge**: Animated circular health score display
- **ProductCard**: Product information display
- **ProsCons**: Health benefits and concerns lists

### Adding New Features

1. **New Scoring Factors**: Modify `lib/scoring.ts`
2. **Additional APIs**: Add routes in `app/api/`
3. **UI Components**: Create components in `components/`
4. **Hooks**: Add custom hooks in `hooks/`

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

1. Build the application: `npm run build`
2. Start production server: `npm start`
3. Set environment variables on your hosting platform

## Troubleshooting

### Common Issues

**Camera not working:**

- Ensure HTTPS in production (required for camera access)
- Check browser permissions
- Try refreshing the page

**AI enhancement not working:**

- Verify API keys in `.env.local`
- Check API key quotas and limits
- Ensure proper environment variable names

**Barcode detection issues:**

- Ensure good lighting
- Hold device steady
- Try different angles
- Check barcode quality

**Network errors:**

- Verify internet connection
- Check Open Food Facts API status
- Ensure proper CORS configuration

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Open Food Facts](https://world.openfoodfacts.org/) for product data
- [AI SDK](https://sdk.vercel.ai/) for AI integration
- [shadcn/ui](https://ui.shadcn.com/) for component library
- [ZXing](https://github.com/zxing-js/library) for barcode detection

## Support

For issues and questions:

1. Check the troubleshooting section
2. Search existing GitHub issues
3. Create a new issue with detailed information
4. Include browser, device, and error details
