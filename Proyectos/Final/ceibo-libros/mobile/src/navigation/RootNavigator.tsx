// Estructura de navegación:
//   sin sesión  -> Auth (Login, Registro, Código, Olvidé)
//   con sesión  -> Menú desplegable (Drawer) > Pila (Main) > Botones principales (Tabs, según el rol)
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer, createNavigationContainerRef, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { Skeleton } from '../components/Skeleton';
import FondoDecorativo, { useHayFondo } from '../components/FondoDecorativo';
import BottomBar, { pantallaActual } from '../components/BottomBar';
import DrawerContent from './DrawerContent';

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
import InformesScreen from '../screens/estadisticas/InformesScreen';
import PedirLibrosScreen from '../screens/reposicion/PedirLibrosScreen';
import DistribuidorasScreen from '../screens/reposicion/DistribuidorasScreen';
import NotificacionesScreen from '../screens/notificaciones/NotificacionesScreen';
import ManualScreen from '../screens/ManualScreen';
import HistorialBusquedasScreen from '../screens/busquedas/HistorialBusquedasScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Los navegadores usan rutas por nombre sin lista de tipos (React Navigation exige un `id` si se tipan a medias)
const AuthStack = createNativeStackNavigator() as any;
const Drawer = createDrawerNavigator() as any;
const Stack = createNativeStackNavigator() as any;
const Tab = createBottomTabNavigator() as any;
const navRef = createNavigationContainerRef<any>();

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
          Reservas: 'libros-reservados', Calendario: 'calendario', Estadisticas: 'estadisticas', Informes: 'informes',
          Categorias: 'categorias', EditarPerfil: 'perfil/editar', Seguridad: 'perfil/seguridad', Admin: 'administracion',
          PedirLibros: 'pedir-libros', Distribuidoras: 'distribuidoras', Notificaciones: 'notificaciones', Manual: 'manual', HistorialBusquedas: 'historial-busquedas',
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

// En la compu las pantallas son transparentes (se ve el dibujo de fondo): una pestaña que no se está mirando
// no debe dibujarse, si no se transparenta detrás de la pestaña activa.
const soloEnfocada = (Pantalla: React.ComponentType<any>) => {
  const Envuelta = (props: any) => (useIsFocused() ? <Pantalla {...props} /> : null);
  Envuelta.displayName = `Enfocada(${Pantalla.displayName || Pantalla.name || 'Pantalla'})`;
  return Envuelta;
};
const TInicio = soloEnfocada(HomeScreen);
const TMensajes = soloEnfocada(MensajesScreen);
const TStock = soloEnfocada(StockScreen);
const TReservas = soloEnfocada(ReservasScreen);
const TPrestamos = soloEnfocada(PrestamosScreen);
const TUsuarios = soloEnfocada(UsuariosScreen);
const TPerfil = soloEnfocada(PerfilScreen);

// Botones principales según el rol:
//   usuario:       Inicio · Mensajes · Reservas · Préstamos · Perfil
//   bibliotecario: Inicio · Mensajes · Stock · Reservas · Préstamos · Usuarios · Perfil
//   gerente:         Inicio · Mensajes · Stock · Reservas · Préstamos · Usuarios · Perfil
function Tabs() {
  const { usuario } = useAuth();
  const staff = usuario.rol !== 'usuario';
  return (
    <Tab.Navigator key={usuario.rol} tabBar={() => null} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Inicio" component={TInicio} />
      <Tab.Screen name="Mensajes" component={TMensajes} />
      {staff ? <Tab.Screen name="Stock" component={TStock} /> : null}
      <Tab.Screen name="ReservasTab" component={TReservas} />
      <Tab.Screen name="Prestamos" component={TPrestamos} />
      {staff ? <Tab.Screen name="Usuarios" component={TUsuarios} /> : null}
      <Tab.Screen name="Perfil" component={TPerfil} />
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
      <Stack.Screen name="Informes" component={InformesScreen} />
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
      <Stack.Screen name="HistorialBusquedas" component={HistorialBusquedasScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  // Ya no hay menú lateral: todos los accesos están en el menú de la cuenta (arriba a la derecha).
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        swipeEnabled: false, // los accesos están en el menú de la cuenta (arriba a la derecha)
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

  // En la compu las pantallas son transparentes para que se vea el dibujo de fondo a los costados
  const hayFondo = useHayFondo();
  const base = isDark ? DarkTheme : DefaultTheme;
  const tema = {
    ...base,
    colors: { ...base.colors, background: hayFondo ? 'transparent' : colors.bg, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary },
  };

  // Mientras se revisa si había una sesión guardada
  if (restaurando) {
    return <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 80 }}><Skeleton height={40} width="60%" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {hayFondo ? <FondoDecorativo /> : null}
      <NavigationContainer ref={navRef} theme={tema} linking={linking} documentTitle={{ formatter: () => 'Ceibo Libros' }}>
        {usuario ? <AppNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </View>
  );
}
