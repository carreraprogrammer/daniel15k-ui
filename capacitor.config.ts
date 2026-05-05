import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.daniel15k.app',
  appName: 'Daniel 15K',
  webDir: 'dist',
  plugins: {
    SocialLogin: {
      google: {
        iOSClientId: '224259448673-ec625g235gj916acod4i7u0suql0a5eh.apps.googleusercontent.com',
      },
    },
  },
};

export default config;
