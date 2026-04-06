#!/bin/bash
# Deploy Affordability for All to Netlify
# Usage: ./deploy.sh [message]

set -e
cd "$(dirname "$0")"

echo "Building site..."
python3 build.py

echo ""
echo "Staging and pushing..."
git add -A
git commit -m "${1:-Update site}" --allow-empty
git push origin main

echo ""
echo "Pushed to GitHub. Netlify will auto-deploy from main."
echo "Site: https://affordability-for-all.netlify.app"
