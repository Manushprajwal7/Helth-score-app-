#!/bin/bash

# Install dependencies
npm install

# Build the application
npm run build

# Create necessary Netlify files
mkdir -p .netlify/functions
touch .netlify/functions/___netlify-handler.js

echo "Build completed successfully!"
