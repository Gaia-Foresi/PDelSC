// Botones de ingreso con Google, GitHub y Discord (expo-auth-session).
// Cada proveedor es un componente aparte: si falta el Client ID se muestra el botón igual,
// pero al tocarlo avisa qué falta configurar (sin romper la app).
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../api';
import { OAUTH } from '../api/config';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useTheme } from '../theme/ThemeContext';
import { MIN_TAP, radius, spacing } from '../theme/tokens';

WebBrowser.maybeCompleteAuthSession();

const redirectUri = AuthSession.makeRedirectUri({ scheme: 'ceibolibros', path: 'oauth' });
// Esta es la dirección que hay que registrar en GitHub y Discord (se ve en la consola al iniciar la app)
if (__DEV__) console.info(`[login social] URI de redirección para GitHub/Discord: ${redirectUri}`);

// Abre la ventana del proveedor. Si quedó una ventana anterior abierta o colgada (cerrada a mano, bloqueada,
// con error), la cierra primero: expo-auth-session solo admite una sesión activa a la vez.
async function abrir(promptAsync, toast, nombre) {
  try { WebBrowser.dismissAuthSession(); } catch { /* no hay ventana previa */ }
  try {
    await promptAsync();
  } catch {
    toast.error(`No se pudo abrir la ventana de ${nombre}. Permití las ventanas emergentes de este sitio y probá de nuevo.`);
  }
}

function ProviderButton({ nombre, icon, onPress, loading, disabled }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continuar con ${nombre}`}
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [styles.btn, { backgroundColor: colors.card, borderColor: colors.border, opacity: loading || disabled ? 0.6 : pressed ? 0.85 : 1 }]}
    >
      <MaterialCommunityIcons name={icon} size={20} color={colors.text} />
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={1}>{nombre}</Text>
    </Pressable>
  );
}

// Lógica común: manda el resultado al backend y abre la sesión
function useCompletar(modo) {
  const { iniciarSesion } = useAuth();
  const toast = useToast();
  const [cargando, setCargando] = useState(false);
  const completar = async (cuerpo) => {
    setCargando(true);
    try {
      const data = await api.auth.social({ ...cuerpo, modo });
      await iniciarSesion(data);
    } catch (e) {
      toast.fromError(e, 'No pudimos ingresar con esa cuenta.');
    } finally {
      setCargando(false);
    }
  };
  return { cargando, completar, toast };
}

function GoogleReal({ modo }) {
  const { cargando, completar, toast } = useCompletar(modo);
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: OAUTH.googleWebClientId || undefined,
    androidClientId: OAUTH.googleAndroidClientId || undefined,
    iosClientId: OAUTH.googleIosClientId || undefined,
  });
  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.authentication?.accessToken;
      if (token) completar({ proveedor: 'google', token });
    } else if (response?.type === 'error') {
      toast.error('Google no pudo completar el ingreso. Intentá de nuevo.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);
  return <ProviderButton nombre="Google" icon="google" loading={cargando} disabled={!request} onPress={() => abrir(promptAsync, toast, 'Google')} />;
}

// En el celular GitHub usa su propia app (la dirección de retorno es ceibolibros://oauth, distinta a la de la web)
const githubId = Platform.OS === 'web' ? OAUTH.githubClientId : OAUTH.githubMobileClientId || OAUTH.githubClientId;
const githubDiscovery = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
};
function GitHubReal({ modo }) {
  const { cargando, completar, toast } = useCompletar(modo);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { clientId: githubId, scopes: ['read:user', 'user:email'], redirectUri, usePKCE: true },
    githubDiscovery,
  );
  useEffect(() => {
    if (response?.type === 'success' && response.params?.code) {
      // GitHub: el backend canjea el code (el client secret nunca va en la app)
      completar({ proveedor: 'github', code: response.params.code, redirect_uri: redirectUri, code_verifier: request?.codeVerifier });
    } else if (response?.type === 'error') {
      toast.error('GitHub no pudo completar el ingreso. Intentá de nuevo.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);
  return <ProviderButton nombre="GitHub" icon="github" loading={cargando} disabled={!request} onPress={() => abrir(promptAsync, toast, 'GitHub')} />;
}

const discordDiscovery = { authorizationEndpoint: 'https://discord.com/oauth2/authorize', tokenEndpoint: 'https://discord.com/api/oauth2/token' };
function DiscordReal({ modo }) {
  const { cargando, completar, toast } = useCompletar(modo);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { clientId: OAUTH.discordClientId, scopes: ['identify', 'email'], redirectUri, responseType: AuthSession.ResponseType.Token },
    discordDiscovery,
  );
  useEffect(() => {
    if (response?.type === 'success' && response.params?.access_token) {
      completar({ proveedor: 'discord', token: response.params.access_token });
    } else if (response?.type === 'error') {
      toast.error('Discord no pudo completar el ingreso. Intentá de nuevo.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);
  return <ProviderButton nombre="Discord" icon="controller-classic" loading={cargando} disabled={!request} onPress={() => abrir(promptAsync, toast, 'Discord')} />;
}

// Botón de un proveedor sin configurar: solo avisa
function SinConfigurar({ nombre, icon, variable }) {
  const toast = useToast();
  return (
    <ProviderButton
      nombre={nombre}
      icon={icon}
      onPress={() => toast.info(`El ingreso con ${nombre} todavía no está activado. Hay que cargar ${variable} en mobile/.env (paso a paso en docs/LOGIN_SOCIAL.md) y reiniciar con "npx expo start -c".`)}
    />
  );
}

// modo 'ingreso': solo entra quien ya tiene cuenta · modo 'registro': crea la cuenta si no existe
export default function SocialButtons({ modo = 'ingreso' }) {
  // Google pide el Client ID de la plataforma donde corre la app; si falta el de esta plataforma, solo se avisa
  // (antes la app se rompía en el celular con "androidClientId must be defined").
  const googleId = Platform.select({ web: OAUTH.googleWebClientId, android: OAUTH.googleAndroidClientId, ios: OAUTH.googleIosClientId });
  const googleOk = !!googleId;
  return (
    <View style={styles.row}>
      {googleOk ? <GoogleReal modo={modo} /> : <SinConfigurar nombre="Google" icon="google" variable={Platform.OS === 'web' ? 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID' : Platform.OS === 'android' ? 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID' : 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'} />}
      {githubId ? <GitHubReal modo={modo} /> : <SinConfigurar nombre="GitHub" icon="github" variable={Platform.OS === 'web' ? 'EXPO_PUBLIC_GITHUB_CLIENT_ID' : 'EXPO_PUBLIC_GITHUB_MOBILE_CLIENT_ID'} />}
      {OAUTH.discordClientId ? <DiscordReal modo={modo} /> : <SinConfigurar nombre="Discord" icon="controller-classic" variable="EXPO_PUBLIC_DISCORD_CLIENT_ID" />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1, minWidth: 0, minHeight: MIN_TAP, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 6 },
  text: { fontSize: 13.5, fontWeight: '700', flexShrink: 1 },
});
