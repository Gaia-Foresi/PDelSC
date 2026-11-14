// Calendario del personal: visitas a la biblioteca (reservas y préstamos) en un rango de fechas.
import { consultar } from '../config/db.js';
import { aUtc, publica } from '../services/visitas.js';
import * as R from '../services/reservas.js';

// Convierte una fecha local 'YYYY-MM-DD' en el instante UTC en que empieza ese día (se le pueden sumar días).
const aFechaUtc = (fecha, sumarDias = 0) => {
  const [y, m, d] = fecha.split('-').map(Number);
  return aUtc(y, m, d + sumarDias);
};

// Devuelve todas las visitas (reservas y préstamos) entre dos fechas, ordenadas por hora.
export const listar = async (req, res) => {
  const { desde, hasta } = req.body; // fechas locales YYYY-MM-DD, ambas incluidas
  const inicio = aFechaUtc(desde);
  // "fin" es el día siguiente a "hasta", así el último día entra completo.
  const fin = aFechaUtc(hasta, 1);
  // Antes de listar, marcamos como vencidas las reservas que ya pasaron.
  await R.expirarReservas();

  // Reservas. Las "para llevar" ya cumplidas se ven como préstamo, y las canceladas no se muestran.
  const reservas = await consultar(
    `SELECT r.id, r.tipo, r.estado, r.visita_en, r.codigo_retiro, l.titulo,
            u.id AS usuario_id, u.nombre, u.apellido, u.curso, u.dni
     FROM reservas r JOIN libros l ON l.id = r.libro_id JOIN usuarios u ON u.id = r.usuario_id
     WHERE r.visita_en >= ? AND r.visita_en < ?
       AND r.estado <> 'cancelada' AND NOT (r.estado = 'cumplida' AND r.tipo = 'retiro')`, [inicio, fin]);

  const prestamos = await consultar(
    `SELECT p.id, p.estado, p.visita_en, p.codigo_retiro,
            u.id AS usuario_id, u.nombre, u.apellido, u.curso, u.dni
     FROM prestamos p JOIN usuarios u ON u.id = p.usuario_id
     WHERE p.visita_en >= ? AND p.visita_en < ?`, [inicio, fin]);
  // Los títulos de cada préstamo están en otra tabla: los traemos todos juntos con IN (?).
  const libros = prestamos.length
    ? await consultar(
      `SELECT pi.prestamo_id, l.titulo FROM prestamo_items pi JOIN libros l ON l.id = pi.libro_id
       WHERE pi.prestamo_id IN (?) ORDER BY pi.id`, [prestamos.map((p) => p.id)])
    : [];

  // Arma los datos de la persona con el mismo formato para reservas y préstamos.
  const persona = (f) => ({ id: f.usuario_id, nombre: f.nombre, apellido: f.apellido, curso: f.curso, dni: f.dni });
  // Juntamos reservas y préstamos en una sola lista de "eventos" y la ordenamos por fecha de visita.
  const eventos = [
    ...reservas.map((r) => ({
      clave: `reserva-${r.id}`, tipo: 'reserva', ref_id: r.id, subtipo: r.tipo, estado: r.estado,
      visita: publica(r.visita_en), codigo_retiro: r.codigo_retiro, usuario: persona(r), libros: [r.titulo],
    })),
    ...prestamos.map((p) => ({
      clave: `prestamo-${p.id}`, tipo: 'prestamo', ref_id: p.id, subtipo: null, estado: p.estado,
      visita: publica(p.visita_en), codigo_retiro: p.codigo_retiro, usuario: persona(p),
      libros: libros.filter((l) => l.prestamo_id === p.id).map((l) => l.titulo),
    })),
  ].sort((a, b) => a.visita.en.localeCompare(b.visita.en));

  res.json({ ok: true, data: { eventos } });
};
