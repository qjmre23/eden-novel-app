import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.edennovel.app",
  appName: "Eden Novel",
  webDir: "dist",
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#09090b",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#09090b",
    },
    Keyboard: {
      resize: "body",
      style: "dark",
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
  server: {
    androidScheme: "https",
    cleartext: false,
    allowNavigation: [
      "*.googleapis.com",
      "*.google.com",
      "*.gstatic.com",
      "*.firebaseapp.com",
      "*.firebaseio.com",
      "*.firebase.google.com",
      "*.anthropic.com",
      "*.openai.com",
      "*.huggingface.co",
      "*.amazonaws.com",
      "*.bedrock.aws",
      "*.x.ai",
      "*.deepseek.com",
      "*.gemini.google.com",
      "generativelanguage.googleapis.com",
    ],
  },
};

export default config;
