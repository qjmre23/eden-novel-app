#!/usr/bin/env bash
set -e

echo "╔══════════════════════════════════════════════╗"
echo "║      Eden Novel — Android APK Builder        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "▶ Step 1: Building web assets for Android..."
npx vite build --config vite.config.android.ts
echo "  ✓ Web build complete → dist/android/"
echo ""

echo "▶ Step 2: Syncing to Android project..."
npx cap sync android
echo "  ✓ Sync complete"
echo ""

echo "▶ Step 3: Copying assets..."
npx cap copy android
echo "  ✓ Assets copied"
echo ""

echo "╔══════════════════════════════════════════════╗"
echo "║  ✓ Android project is ready!                ║"
echo "║                                              ║"
echo "║  To open in Android Studio:                  ║"
echo "║    npx cap open android                      ║"
echo "║                                              ║"
echo "║  To build APK directly (needs Android SDK): ║"
echo "║    cd android                                ║"
echo "║    ./gradlew assembleDebug                   ║"
echo "║    # APK → android/app/build/outputs/apk/   ║"
echo "║                                              ║"
echo "║  For a signed release APK:                   ║"
echo "║    ./gradlew assembleRelease                 ║"
echo "╚══════════════════════════════════════════════╝"
