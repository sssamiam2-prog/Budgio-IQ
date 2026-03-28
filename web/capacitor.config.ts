import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budgio.iq',
  appName: 'Budgio IQ',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
};

export default config;
