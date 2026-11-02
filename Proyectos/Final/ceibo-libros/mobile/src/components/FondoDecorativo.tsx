// Dibujo de fondo para la versión de compu: enredaderas con flores y libros flotando que llenan los costados vacíos
// (a los lados de la columna de contenido). Solo se muestra en la web con pantalla ancha; en el celular no existe.
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useAnchoColumna } from '../utils/fondo';
import { ANCHO_MENU_FIJO } from '../utils/useResponsive';

/** ¿Se muestra el dibujo? Solo web y pantalla ancha. */
export function useHayFondo(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= ANCHO_MENU_FIJO;
}

// Números "al azar" pero siempre iguales (así el dibujo no cambia en cada recarga)
function semilla(n: number) {
  let t = n >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const entre = (az: () => number, a: number, b: number) => a + (b - a) * az();

interface Colores {
  tallo: string; hoja: string; hojaOscura: string; petalos: string[]; centro: string; libros: string[]; hojasLibro: string; brillo: string;
  opTallo: number; opHoja: number; opFlor: number; opLibro: number;
}

function paleta(oscuro: boolean): Colores {
  return oscuro
    ? {
      tallo: '#9CAF88', hoja: '#8FAE8B', hojaOscura: '#5E7F5C', petalos: ['#E0C097', '#C98B8B', '#B7A0D0', '#E8D9A8'], centro: '#F3E5D8',
      libros: ['#8D5524', '#5D4037', '#4A5D23', '#7A3B3B', '#37474F'], hojasLibro: '#F3E5D8', brillo: '#E0C097',
      opTallo: 0.42, opHoja: 0.42, opFlor: 0.7, opLibro: 0.42,
    }
    : {
      tallo: '#4A5D23', hoja: '#8FAE8B', hojaOscura: '#5F8460', petalos: ['#C62828', '#E0A458', '#D98C9B', '#F2C94C', '#9C6BB0'], centro: '#FFF3C4',
      libros: ['#8D5524', '#5D4037', '#2E4A2E', '#B85C38', '#37474F', '#C62828'], hojasLibro: '#FFFAF4', brillo: '#B8893B',
      opTallo: 0.55, opHoja: 0.6, opFlor: 0.85, opLibro: 0.5,
    };
}

const hojaPath = (l: number, a: number) => `M0 0 C${l * 0.3} ${-a}, ${l * 0.75} ${-a}, ${l} 0 C${l * 0.75} ${a}, ${l * 0.3} ${a}, 0 0 Z`;

function Flor({ x, y, r, color, centro, rot, op }: { x: number; y: number; r: number; color: string; centro: string; rot: number; op: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot})`} opacity={op}>
      {[0, 72, 144, 216, 288].map((a) => (
        <Ellipse key={a} cx={0} cy={-r * 0.62} rx={r * 0.42} ry={r * 0.68} fill={color} transform={`rotate(${a})`} />
      ))}
      <Circle r={r * 0.3} fill={centro} />
    </G>
  );
}

function Libro({ x, y, w, rot, color, hojas, brillo, abierto, op }: { x: number; y: number; w: number; rot: number; color: string; hojas: string; brillo: string; abierto: boolean; op: number }) {
  const h = w * 1.32;
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot})`} opacity={op}>
      {abierto ? (
        <>
          <Path d={`M0 ${-h * 0.35} L${-w * 0.95} ${-h * 0.2} L${-w * 0.95} ${h * 0.45} L0 ${h * 0.35} Z`} fill={hojas} stroke={color} strokeWidth={2} />
          <Path d={`M0 ${-h * 0.35} L${w * 0.95} ${-h * 0.2} L${w * 0.95} ${h * 0.45} L0 ${h * 0.35} Z`} fill={hojas} stroke={color} strokeWidth={2} />
          <Path d={`M${-w * 0.8} ${-h * 0.08} L${-w * 0.12} ${-h * 0.2} M${-w * 0.8} ${h * 0.08} L${-w * 0.12} ${-h * 0.04} M${-w * 0.8} ${h * 0.24} L${-w * 0.12} ${h * 0.12}`} stroke={color} strokeWidth={1.5} opacity={0.6} />
          <Path d={`M${w * 0.12} ${-h * 0.2} L${w * 0.8} ${-h * 0.08} M${w * 0.12} ${-h * 0.04} L${w * 0.8} ${h * 0.08} M${w * 0.12} ${h * 0.12} L${w * 0.8} ${h * 0.24}`} stroke={color} strokeWidth={1.5} opacity={0.6} />
        </>
      ) : (
        <>
          <Rect x={-w / 2} y={-h / 2} width={w} height={h} rx={w * 0.08} fill={color} />
          <Rect x={-w / 2 + w * 0.14} y={-h / 2 + h * 0.08} width={w * 0.78} height={h * 0.84} rx={w * 0.04} fill="none" stroke={brillo} strokeWidth={1.6} opacity={0.9} />
          <Rect x={-w / 2} y={-h / 2} width={w * 0.12} height={h} rx={w * 0.05} fill="#000" opacity={0.18} />
          <Rect x={-w * 0.08} y={-h * 0.28} width={w * 0.5} height={h * 0.07} rx={2} fill={brillo} opacity={0.9} />
          <Rect x={-w * 0.08} y={-h * 0.16} width={w * 0.34} height={h * 0.05} rx={2} fill={brillo} opacity={0.7} />
          <Rect x={-w / 2 + 2} y={h / 2 - h * 0.07} width={w - 4} height={h * 0.07} fill={hojas} opacity={0.9} />
        </>
      )}
    </G>
  );
}

// Una zona (borde izquierdo): enredadera principal, una más fina pegada al borde, flores, hojas y libros flotando
function zona(ancho: number, alto: number, pal: Colores, sem: number) {
  const az = semilla(sem);
  const elementos: React.ReactElement[] = [];
  let k = 0;
  const id = () => `e${k++}`;

  const enredadera = (x0: number, amp: number, paso: number, grosor: number, hojaMin: number, hojaMax: number, conFlores: boolean) => {
    let d = `M${x0} ${alto + 30}`;
    let y = alto + 30;
    let signo = 1;
    const puntos: { x: number; y: number }[] = [];
    let x = x0;
    while (y > -40) {
      const ny = y - paso;
      const nx = Math.max(6, Math.min(ancho - 6, x0 + signo * amp * entre(az, 0.5, 1)));
      d += ` C${x + signo * -amp * 0.2} ${y - paso * 0.35}, ${nx + signo * amp * 0.2} ${y - paso * 0.65}, ${nx} ${ny}`;
      puntos.push({ x: nx, y: ny });
      x = nx; y = ny; signo = -signo;
    }
    elementos.push(<Path key={id()} d={d} stroke={pal.tallo} strokeWidth={grosor} fill="none" strokeLinecap="round" opacity={pal.opTallo} />);

    // Hojas y flores a lo largo del tallo (se interpola entre los puntos)
    for (let i = 0; i < puntos.length - 1; i++) {
      const a = puntos[i]; const b = puntos[i + 1];
      for (let t = 0.15; t < 1; t += 0.42) {
        const px = a.x + (b.x - a.x) * t; const py = a.y + (b.y - a.y) * t;
        const lado = az() > 0.5 ? 1 : -1;
        const largo = entre(az, hojaMin, hojaMax);
        const ang = (lado > 0 ? 0 : 180) + entre(az, -50, 50) - 90 * 0 + (lado > 0 ? -25 : 25);
        elementos.push(
          <G key={id()} transform={`translate(${px} ${py}) rotate(${ang})`}>
            <Path d={hojaPath(largo, largo * 0.32)} fill={az() > 0.5 ? pal.hoja : pal.hojaOscura} opacity={pal.opHoja} />
            <Path d={`M0 0 L${largo * 0.8} 0`} stroke={pal.tallo} strokeWidth={1} opacity={pal.opHoja * 0.7} />
          </G>,
        );
        if (conFlores && az() > 0.62) {
          const dx = lado * entre(az, 16, 30); const dy = entre(az, -18, 8);
          elementos.push(<Path key={id()} d={`M${px} ${py} Q${px + dx * 0.4} ${py + dy - 10} ${px + dx} ${py + dy}`} stroke={pal.tallo} strokeWidth={1.6} fill="none" opacity={pal.opTallo} />);
          elementos.push(<Flor key={id()} x={px + dx} y={py + dy} r={entre(az, 8, 15)} color={pal.petalos[Math.floor(az() * pal.petalos.length)]} centro={pal.centro} rot={entre(az, 0, 72)} op={pal.opFlor} />);
        }
      }
    }
  };

  if (ancho >= 24) enredadera(ancho * 0.22, Math.min(34, ancho * 0.18), 120, 3.2, 16, 30, true);
  if (ancho >= 24) enredadera(Math.min(12, ancho * 0.08), Math.min(8, ancho * 0.08), 95, 2.2, 10, 18, false);

  // Libros flotando
  const filas = ancho < 90 ? 0 : Math.max(3, Math.round(alto / 170));
  for (let i = 0; i < filas; i++) {
    const w = Math.min(entre(az, 30, 56), (ancho - 12) / 2.1);
    const radioLibro = w * 1.05;
    const x = radioLibro + (ancho - radioLibro * 2) * entre(az, 0.25, 1);
    const y = (alto / filas) * (i + 0.5) + entre(az, -30, 30);
    elementos.push(
      <Libro key={id()} x={x} y={y} w={w} rot={entre(az, -38, 38)} color={pal.libros[Math.floor(az() * pal.libros.length)]}
        hojas={pal.hojasLibro} brillo={pal.brillo} abierto={az() > 0.6} op={pal.opLibro} />,
    );
    // Chispitas alrededor
    for (let s = 0; s < 3; s++) {
      elementos.push(<Circle key={id()} cx={Math.max(4, Math.min(ancho - 4, x + entre(az, -60, 60)))} cy={y + entre(az, -50, 50)} r={entre(az, 1.5, 3.2)} fill={pal.brillo} opacity={0.5} />);
    }
  }
  return elementos;
}

export default function FondoDecorativo() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const oscuro = colors.mode === 'dark';
  // Ancho de cada zona: el espacio que queda libre a los costados de la columna de contenido de la pantalla actual
  const columna = useAnchoColumna();
  const Z = Math.round(Math.max(0, Math.min(520, (width - columna) / 2)));
  const alto = Math.round(height / 20) * 20;

  const izquierda = useMemo(() => zona(Z, alto, paleta(oscuro), 11), [Z, alto, oscuro]);
  const derecha = useMemo(() => zona(Z, alto, paleta(oscuro), 29), [Z, alto, oscuro]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <G>{izquierda}</G>
        <G transform={`translate(${width} 0) scale(-1 1)`}>{derecha}</G>
      </Svg>
    </View>
  );
}
