// Íconos y colores que se pueden elegir para una categoría. Cada ícono tiene palabras clave en español para buscarlo.
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Def = [nombre: string, claves: string];

const DEFINICIONES: Def[] = [
  ['book-open-variant', 'libro abierto lectura'], ['book-open-page-variant', 'libro paginas'], ['bookshelf', 'biblioteca estante libros'], ['library', 'biblioteca'],
  ['book-education', 'libro educacion estudio'], ['book-multiple', 'libros coleccion'], ['notebook-outline', 'cuaderno apuntes'], ['newspaper-variant-outline', 'diario periodico noticias'],
  ['feather', 'pluma poesia escritura'], ['pen', 'lapicera escritura'], ['script-text-outline', 'guion teatro obra'], ['bookmark-outline', 'marcador'],
  ['leaf', 'hoja naturaleza plantas'], ['flower', 'flor jardin'], ['flower-tulip', 'flor tulipan'], ['tree', 'arbol bosque'], ['sprout', 'brote plantas germinar'],
  ['cactus', 'cactus desierto'], ['mushroom', 'hongo'], ['paw', 'animales mascotas'], ['bird', 'ave pajaro'], ['fish', 'pez peces mar'], ['butterfly', 'mariposa insectos'],
  ['turtle', 'tortuga'], ['cat', 'gato'], ['dog', 'perro'], ['rabbit', 'conejo'], ['bee', 'abeja'], ['dolphin', 'delfin'], ['owl', 'buho'],
  ['earth', 'mundo planeta geografia'], ['map-outline', 'mapa geografia'], ['compass-outline', 'brujula aventura exploracion'], ['airplane', 'viajes avion'],
  ['terrain', 'montanas paisaje'], ['weather-sunny', 'sol clima'], ['weather-night', 'noche luna'], ['weather-snowy', 'nieve invierno'], ['white-balance-sunny', 'sol dia'],
  ['atom', 'ciencia atomo fisica'], ['flask', 'quimica laboratorio'], ['test-tube', 'laboratorio'], ['microscope', 'ciencia biologia'], ['dna', 'genetica biologia'],
  ['calculator-variant', 'matematica calculos'], ['function-variant', 'matematica funciones'], ['chart-line', 'estadistica graficos'], ['telescope', 'astronomia'],
  ['rocket-launch', 'espacio ciencia ficcion cohete'], ['robot-outline', 'robot tecnologia'], ['laptop', 'computacion tecnologia'], ['code-tags', 'programacion codigo'],
  ['bank', 'historia gobierno'], ['castle', 'castillo medieval fantasia'], ['sword', 'espada aventura'], ['shield-outline', 'escudo'], ['crown-outline', 'corona reyes'],
  ['pirate', 'piratas aventura'], ['ship-wheel', 'mar barcos'], ['sail-boat', 'barco navegar'], ['anchor', 'ancla mar'], ['treasure-chest', 'tesoro aventura'],
  ['ghost', 'terror fantasmas misterio'], ['skull-outline', 'terror calavera'], ['magnify', 'misterio detective policial'], ['incognito', 'detective espia'], ['key-variant', 'misterio llave'],
  ['heart', 'romance amor'], ['hand-heart', 'solidaridad'], ['emoticon-happy-outline', 'humor alegria'], ['drama-masks', 'teatro drama'], ['party-popper', 'fiesta celebracion'],
  ['palette', 'arte pintura'], ['brush', 'arte pincel'], ['camera-outline', 'fotografia'], ['movie-open-outline', 'cine peliculas'], ['music', 'musica canciones'], ['guitar-acoustic', 'guitarra musica'],
  ['piano', 'piano'], ['microphone-variant', 'radio voz'], ['theater', 'teatro'],
  ['school', 'escuela estudio'], ['human-child', 'infantil ninos'], ['baby-face-outline', 'bebes'], ['teddy-bear', 'infantil osito'], ['balloon', 'infantil globo'],
  ['account-group-outline', 'sociedad personas'], ['scale-balance', 'derecho leyes justicia'], ['gavel', 'leyes'], ['briefcase-outline', 'negocios trabajo'], ['cash', 'economia dinero'],
  ['church', 'religion'], ['yin-yang', 'filosofia espiritualidad'], ['lightbulb-on-outline', 'ideas filosofia'], ['head-cog-outline', 'psicologia mente'], ['meditation', 'bienestar meditacion'],
  ['heart-pulse', 'salud medicina'], ['medical-bag', 'medicina'], ['dumbbell', 'deportes ejercicio'], ['soccer', 'futbol deportes'], ['basketball', 'basquet deportes'], ['bike', 'bicicleta deportes'],
  ['food-apple-outline', 'cocina alimentos'], ['chef-hat', 'cocina recetas'], ['coffee-outline', 'cafe'], ['glass-wine', 'vino'], ['home-outline', 'hogar casa'], ['hammer-wrench', 'oficios herramientas'],
  ['car-outline', 'autos'], ['train', 'trenes'], ['lightning-bolt', 'energia'], ['fire', 'fuego'], ['water', 'agua'], ['snowflake', 'frio hielo'], ['star', 'estrella destacados'],
  ['star-four-points-outline', 'magia fantasia'], ['wizard-hat', 'magia fantasia brujas'], ['unicorn-variant', 'fantasia unicornio'], ['dragon', 'dragones fantasia'], ['alien-outline', 'extraterrestres ciencia ficcion'],
  ['tag-outline', 'etiqueta varios'], ['shape-outline', 'varios formas'], ['puzzle-outline', 'juegos rompecabezas'], ['gamepad-variant-outline', 'juegos videojuegos'], ['dice-5-outline', 'juegos dados'],
];

export interface IconoCategoria { nombre: string; claves: string }

export const ICONOS_CATEGORIA: IconoCategoria[] = DEFINICIONES
  .filter(([n]) => (MaterialCommunityIcons.glyphMap as Record<string, number>)[n])
  .map(([nombre, claves]) => ({ nombre, claves }));

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function buscarIconos(texto: string): IconoCategoria[] {
  const q = sinTildes(texto.trim());
  if (!q) return ICONOS_CATEGORIA;
  return ICONOS_CATEGORIA.filter((i) => sinTildes(`${i.nombre} ${i.claves}`).includes(q));
}

export const COLORES_CATEGORIA = [
  '#8FAE8B', '#4A5D23', '#2E4A2E', '#9CAF88', '#6B8E23', '#2E7D32', '#00796B', '#26A69A',
  '#0277BD', '#1565C0', '#3F51B5', '#5E35B1', '#8E24AA', '#AD1457', '#C62828', '#E53935',
  '#EF6C00', '#F9A825', '#E0C097', '#B85C38', '#8D5524', '#5D4037', '#37474F', '#607D8B',
];

export const HEX_VALIDO = /^#[0-9A-Fa-f]{6}$/;
