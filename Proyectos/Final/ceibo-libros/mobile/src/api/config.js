// URL del backend y credenciales públicas de OAuth. Se leen de variables EXPO_PUBLIC_* o de app.json (extra).
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};
const oauth = extra.oauth || {};

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || 'http://10.0.2.2:4000/api').replace(/\/$/, '');

export const OAUTH = {
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || oauth.googleWebClientId || '',
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || oauth.googleAndroidClientId || '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || oauth.googleIosClientId || '',
  githubClientId: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || oauth.githubClientId || '',
  githubMobileClientId: process.env.EXPO_PUBLIC_GITHUB_MOBILE_CLIENT_ID || oauth.githubMobileClientId || '',
  discordClientId: process.env.EXPO_PUBLIC_DISCORD_CLIENT_ID || oauth.discordClientId || '',
};
