import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.daniel15k.app',
  appName: 'Ascent',
  webDir: 'dist',
  plugins: {
    // Solo Google: evita linkear los SDKs de Facebook/Apple/Twitter que no usamos.
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: false,
      backgroundColor: '#0B0F19',
      showSpinner: false,
    },
  },
};

export default config;
