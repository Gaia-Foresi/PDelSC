// Genera los manuales en PDF a partir de src/content/manual.json:
//   assets/manuales/manual-usuario.pdf · manual-bibliotecario.pdf · manual-dueno.pdf  (los abre la app según el rol)
//   docs/  -> una copia de cada uno + Manual_Completo.pdf (todos los roles juntos)
//   npm run manual:pdf
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const manual = require('../src/content/manual.json');
const { ROLES, seccionesDe } = require('../src/content/manualRoles');

const COLORES = { texto: '#3E2723', suave: '#6B564D', verde: '#2E4A2E', crema: '#F3E5D8', linea: '#D9C4AE' };
const ETIQUETAS = { todos: 'Todos los roles', usuario: 'Usuario (lector)', bibliotecario: 'Bibliotecario', dueno: 'Dueño' };
const INTRO_ROL = {
  usuario: 'Esta guía explica cómo usar la aplicación como usuario (lector): reservar libros, ver tus préstamos y consultar a la biblioteca.',
  bibliotecario: 'Esta guía explica cómo usar la aplicación como bibliotecario: administrar el stock, registrar préstamos y devoluciones, atender reservas y gestionar usuarios.',
  dueno: 'Esta guía explica cómo usar la aplicación como dueño de la biblioteca. Incluye las tareas del bibliotecario y las funciones exclusivas del dueño.',
};

const carpetaApp = path.join(__dirname, '../assets/manuales');
const carpetaDocs = path.join(__dirname, '../../docs');
fs.mkdirSync(carpetaApp, { recursive: true });
fs.mkdirSync(carpetaDocs, { recursive: true });

function crearPdf({ titulo, subtitulo, intro, secciones, pie, destinos, mostrarRol }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 56, right: 56 },
      bufferPages: true,
      info: { Title: `${titulo} - Ceibo Libros`, Author: 'Ceibo Libros' },
    });
    const principal = destinos[0];
    const archivo = fs.createWriteStream(principal);
    doc.pipe(archivo);
    const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Portada
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORES.crema);
    const logo = path.join(__dirname, '../assets/logo-vertical.png');
    if (fs.existsSync(logo)) doc.image(logo, doc.page.width / 2 - 90, 110, { width: 180 });
    doc.fillColor(COLORES.verde).font('Times-Bold').fontSize(34).text(titulo, 56, 400, { align: 'center', width: ancho });
    doc.fillColor(COLORES.texto).font('Times-Roman').fontSize(18).text(subtitulo, { align: 'center', width: ancho });
    doc.moveDown(2).font('Helvetica').fontSize(11).fillColor(COLORES.suave).text(intro, { align: 'center', width: ancho });

    // Índice
    doc.addPage();
    doc.fillColor(COLORES.verde).font('Times-Bold').fontSize(22).text('Contenido');
    doc.moveDown(0.6);
    for (const s of secciones) {
      doc.fillColor(COLORES.texto).font('Helvetica-Bold').fontSize(12).text(s.tituloNumerado, { continued: mostrarRol });
      if (mostrarRol) doc.fillColor(COLORES.suave).font('Helvetica').fontSize(10).text(`   (${ETIQUETAS[s.para]})`);
      doc.moveDown(0.2);
    }
    doc.fillColor(COLORES.texto).font('Helvetica-Bold').fontSize(12).text('Preguntas frecuentes');

    // Secciones
    for (const s of secciones) {
      doc.addPage();
      doc.fillColor(COLORES.verde).font('Times-Bold').fontSize(22).text(s.tituloNumerado);
      if (mostrarRol) doc.fillColor(COLORES.suave).font('Helvetica-Oblique').fontSize(10).text(`Para: ${ETIQUETAS[s.para]}`);
      doc.moveTo(doc.x, doc.y + 4).lineTo(doc.x + ancho, doc.y + 4).strokeColor(COLORES.linea).stroke();
      doc.moveDown(1);
      for (const it of s.items) {
        doc.fillColor(COLORES.verde).font('Helvetica-Bold').fontSize(12.5).text(it.t);
        doc.fillColor(COLORES.texto).font('Helvetica').fontSize(11).text(it.p, { lineGap: 2 });
        doc.moveDown(0.8);
      }
    }

    // Preguntas frecuentes
    doc.addPage();
    doc.fillColor(COLORES.verde).font('Times-Bold').fontSize(22).text('Preguntas frecuentes');
    doc.moveDown(0.8);
    for (const f of manual.faq) {
      doc.fillColor(COLORES.texto).font('Helvetica-Bold').fontSize(12).text(f.q);
      doc.fillColor(COLORES.suave).font('Helvetica').fontSize(11).text(f.r, { lineGap: 2 });
      doc.moveDown(0.8);
    }

    // Número de página (menos la portada)
    const { count } = doc.bufferedPageRange();
    for (let i = 1; i < count; i += 1) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0; // para escribir en el pie sin que pdfkit agregue una página
      doc.fillColor(COLORES.suave).font('Helvetica').fontSize(9)
        .text(`Ceibo Libros · ${pie} · ${i + 1}`, 56, doc.page.height - 40, { align: 'center', width: ancho });
    }

    // Se copia recién cuando el archivo terminó de escribirse (si no, queda truncado)
    archivo.on('finish', () => {
      for (const d of destinos.slice(1)) fs.copyFileSync(principal, d);
      console.log('✔', destinos.map((d) => path.relative(path.join(__dirname, '../..'), d)).join('  +  '));
      resolve();
    });
    doc.end();
  });
}

(async () => {
  const nombresDocs = { usuario: 'Manual_Usuario.pdf', bibliotecario: 'Manual_Bibliotecario.pdf', dueno: 'Manual_Dueno.pdf' };
  for (const [rol, info] of Object.entries(ROLES)) {
    await crearPdf({
      titulo: info.titulo,
      subtitulo: 'Ceibo Libros · Biblioteca',
      intro: INTRO_ROL[rol],
      secciones: seccionesDe(rol),
      pie: info.titulo,
      destinos: [path.join(carpetaApp, `${info.archivo}.pdf`), path.join(carpetaDocs, nombresDocs[rol])],
      mostrarRol: false,
    });
  }
  // Versión completa (todos los roles en un solo documento)
  await crearPdf({
    titulo: 'Manual completo',
    subtitulo: 'Ceibo Libros · Biblioteca',
    intro: manual.intro,
    secciones: manual.secciones.map((s, i) => ({ ...s, tituloNumerado: `${i + 1}. ${s.titulo}` })),
    pie: 'Manual completo',
    destinos: [path.join(carpetaDocs, 'Manual_Completo.pdf')],
    mostrarRol: true,
  });
})();
