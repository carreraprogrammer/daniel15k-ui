import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.daniel15k.app',
  appName: 'Daniel 15K',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      clientId: '224259448673-ec625g235gj916acod4i7u0suql0a5eh.apps.googleusercontent.com',
      iosClientId: '224259448673-ec625g235gj916acod4i7u0suql0a5eh.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
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
