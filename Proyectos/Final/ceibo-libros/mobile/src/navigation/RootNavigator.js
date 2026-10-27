// Estructura de navegación:
//   sin sesión  -> Auth (Login, Registro, Código, Olvidé)
//   con sesión  -> Menú desplegable (Drawer) > Pila (Main) > Botones principales (Tabs, según el rol)
import React, { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { Skeleton } from '../components/Skeleton';
import BottomBar, { pantallaActual } from '../components/BottomBar';
import DrawerContent from './DrawerContent';
import { ANCHO_MENU_FIJO } from '../utils/useResponsive';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import CodeScreen from '../screens/auth/CodeScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

import HomeScreen from '../screens/home/HomeScreen';
import LibrosCategoriaScreen from '../screens/home/LibrosCategoriaScreen';
import StockScreen from '../screens/stock/StockScreen';
import LibroFormScreen from '../screens/stock/LibroFormScreen';
import CategoriasScreen from '../screens/stock/CategoriasScreen';
import PrestamosScreen from '../screens/prestamos/PrestamosScreen';
import PrestamoDetalleScreen from '../screens/prestamos/PrestamoDetalleScreen';
import PrestamoNuevoScreen from '../screens/prestamos/PrestamoNuevoScreen';
import ReservasScreen from '../screens/prestamos/ReservasScreen';
import CalendarioScreen from '../screens/prestamos/CalendarioScreen';
import PerfilScreen from '../screens/perfil/PerfilScreen';
import EditarPerfilScreen from '../screens/perfil/EditarPerfilScreen';
import SeguridadScreen from '../screens/perfil/SeguridadScreen';
import MensajesScreen from '../screens/mensajes/MensajesScreen';
import HiloScreen from '../screens/mensajes/HiloScreen';
import NuevoMensajeScreen from '../screens/mensajes/NuevoMensajeScreen';
import UsuariosScreen from '../screens/usuarios/UsuariosScreen';
import UsuarioDetalleScreen from '../screens/usuarios/UsuarioDetalleScreen';
import AdminScreen from '../screens/usuarios/AdminScreen';
import EstadisticasScreen from '../screens/estadisticas/EstadisticasScreen';
import PedirLibrosScreen from '../screens/reposicion/PedirLibrosScreen';
import DistribuidorasScreen from '../screens/reposicion/DistribuidorasScreen';
import NotificacionesScreen from '../screens/notificaciones/NotificacionesScreen';
import ManualScreen from '../screens/ManualScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

const AuthStack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navRef = createNavigationContainerRef();

// Direcciones (URL) de cada pantalla en la versión web: permiten recargar la página y usar la flecha "atrás".
// Las pantallas que necesitan datos armados en memoria (formularios) no tienen dirección propia.
const numero = { parse: { id: Number }, stringify: { id: String } };
const linking = {
  prefixes: ['ceibolibros://'],
  config: {
    screens: {
      Login: 'ingresar', Registro: 'registro', Olvide: 'olvide',
      Main: {
        path: '',
        screens: {
          Tabs: {
            path: '',
            screens: { Inicio: 'inicio', Mensajes: 'mensajes', Stock: 'stock', ReservasTab: 'reservas', Prestamos: 'prestamos', Usuarios: 'usuarios', Perfil: 'perfil' },
          },
          Hilo: { path: 'mensajes/:id', ...numero },
          PrestamoDetalle: { path: 'prestamos/:id', ...numero },
          UsuarioDetalle: { path: 'usuarios/:id', ...numero },
          Reservas: 'libros-reservados', Calendario: 'calendario', Estadisticas: 'estadisticas',
          Categorias: 'categorias', EditarPerfil: 'perfil/editar', Seguridad: 'perfil/seguridad', Admin: 'administracion',
          PedirLibros: 'pedir-libros', Distribuidoras: 'distribuidoras', Notificaciones: 'notificaciones', Manual: 'manual',
        },
      },
    },
  },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Registro" component={RegisterScreen} />
      <AuthStack.Screen name="Codigo" component={CodeScreen} />
      <AuthStack.Screen name="Olvide" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// Botones principales según el rol:
//   usuario:       Inicio · Mensajes · Reservas · Préstamos · Perfil
//   bibliotecario: Inicio · Mensajes · Stock · Reservas · Préstamos · Usuarios · Perfil
//   dueño:         Inicio · Mensajes · Stock · Reservas · Préstamos · Usuarios · Perfil
function Tabs() {
  const { usuario } = useAuth();
  const staff = usuario.rol !== 'usuario';
  return (
    <Tab.Navigator key={usuario.rol} tabBar={() => null} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Mensajes" component={MensajesScreen} />
      {staff ? <Tab.Screen name="Stock" component={StockScreen} /> : null}
      <Tab.Screen name="ReservasTab" component={ReservasScreen} />
      <Tab.Screen name="Prestamos" component={PrestamosScreen} />
      {staff ? <Tab.Screen name="Usuarios" component={UsuariosScreen} /> : null}
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <PilaPrincipal />
      </View>
      <BarraFija />
    </View>
  );
}

// La barra de botones principales vive fuera de la pila: aparece siempre, vayas a la pantalla que vayas
function BarraFija() {
  const [actual, setActual] = useState(null);
  useEffect(() => {
    const leer = () => setActual(pantallaActual(navRef.getRootState()));
    leer();
    return navRef.addListener('state', leer);
  }, []);
  const ir = (nombre) => {
    if (!navRef.isReady()) return;
    navRef.navigate('Main', { screen: 'Tabs', params: { screen: nombre } });
  };
  return <BottomBar actual={actual} onIr={ir} />;
}

function PilaPrincipal() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="LibrosCategoria" component={LibrosCategoriaScreen} />
      <Stack.Screen name="LibroForm" component={LibroFormScreen} />
      <Stack.Screen name="Categorias" component={CategoriasScreen} />
      <Stack.Screen name="PrestamoDetalle" component={PrestamoDetalleScreen} />
      <Stack.Screen name="PrestamoNuevo" component={PrestamoNuevoScreen} />
      <Stack.Screen name="Reservas" component={ReservasScreen} />
      <Stack.Screen name="Calendario" component={CalendarioScreen} />
      <Stack.Screen name="Estadisticas" component={EstadisticasScreen} />
      <Stack.Screen name="Hilo" component={HiloScreen} />
      <Stack.Screen name="NuevoMensaje" component={NuevoMensajeScreen} />
      <Stack.Screen name="UsuarioDetalle" component={UsuarioDetalleScreen} />
      <Stack.Screen name="EditarPerfil" component={EditarPerfilScreen} />
      <Stack.Screen name="Seguridad" component={SeguridadScreen} />
      <Stack.Screen name="Admin" component={AdminScreen} />
      <Stack.Screen name="PedirLibros" component={PedirLibrosScreen} />
      <Stack.Screen name="Distribuidoras" component={DistribuidorasScreen} />
      <Stack.Screen name="Notificaciones" component={NotificacionesScreen} />
      <Stack.Screen name="Manual" component={ManualScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  // Celular: menú que se abre con ☰. Compu / pantalla ancha: sin menú lateral (accesos en la barra superior).
  const { width } = useWindowDimensions();
  const fijo = width >= ANCHO_MENU_FIJO;
  const { esDueno } = useAuth(); // solo el dueño tiene menú desplegable (Estadísticas, Panel admin, Pedir libros)
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        swipeEnabled: !fijo && esDueno,
        drawerStyle: { width: '78%', maxWidth: 340 },
      }}
    >
      <Drawer.Screen name="Main" component={MainStack} />
    </Drawer.Navigator>
  );
}

export default function RootNavigator() {
  const { colors, isDark } = useTheme();
  const { usuario, restaurando } = useAuth();

  useEffect(() => {
    if (!restaurando) SplashScreen.hideAsync().catch(() => {});
  }, [restaurando]);

  const base = isDark ? DarkTheme : DefaultTheme;
  const tema = {
    ...base,
    colors: { ...base.colors, background: colors.bg, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary },
  };

  // Mientras se revisa si había una sesión guardada
  if (restaurando) {
    return <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 80 }}><Skeleton height={40} width="60%" /></View>;
  }

  return (
    <NavigationContainer ref={navRef} theme={tema} linking={linking} documentTitle={{ formatter: () => 'Ceibo Libros' }}>
      {usuario ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
