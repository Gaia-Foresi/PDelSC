// Busca la portada de un libro en internet y devuelve un LINK (no se descarga ninguna imagen).
// Primero Open Library; si no hay, Google Books. Nunca lanza errores: si no encuentra nada devuelve null.
const TIMEOUT_MS = 7000;

async function pedirJson(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'application/json', 'User-Agent': 'CeiboLibros/1.0' } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

const limpiar = (t) => String(t || '').replace(/\s+/g, ' ').trim();

async function openLibrary(titulo, autor) {
  const q = new URLSearchParams({ title: titulo, limit: '5', fields: 'cover_i,title,author_name' });
  if (autor) q.set('author', autor);
  const j = await pedirJson(`https://openlibrary.org/search.json?${q}`);
  const doc = j?.docs?.find((d) => d.cover_i);
  return doc ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null;
}

async function googleBooks(titulo, autor) {
  const q = `intitle:${titulo}${autor ? `+inauthor:${autor}` : ''}`;
  const j = await pedirJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q).replace(/%2B/g, '+')}&maxResults=5&printType=books`);
  const links = j?.items?.map((i) => i.volumeInfo?.imageLinks).find((l) => l && (l.thumbnail || l.smallThumbnail));
  const url = links?.thumbnail || links?.smallThumbnail;
  return url ? url.replace(/^http:/, 'https:').replace('&edge=curl', '') : null;
}

/** @returns {Promise<string|null>} URL de la portada o null */
async function buscarPortada(titulo, autor) {
  const t = limpiar(titulo);
  if (!t) return null;
  const a = limpiar(autor);
  try {
    return (await openLibrary(t, a)) || (await googleBooks(t, a)) || (a ? await openLibrary(t, '') : null);
  } catch {
    return null;
  }
}

/** Completa, de a uno y con pausa, las portadas que faltan. Pensado para correr en segundo plano. */
async function completarPortadasFaltantes(pool, { limite = 60, todas = false, log = console.log } = {}) {
  const [libros] = await pool.query(
    `SELECT l.id, l.titulo, a.nombre AS autor FROM libros l JOIN autores a ON a.id = l.autor_id
     WHERE l.activo = 1 ${todas ? '' : 'AND (l.portada_url IS NULL OR l.portada_url = \'\')'} ORDER BY l.id LIMIT ?`, [limite]);
  let ok = 0;
  for (const l of libros) {
    const url = await buscarPortada(l.titulo, l.autor);
    if (url) {
      await pool.query('UPDATE libros SET portada_url = ? WHERE id = ?', [url, l.id]);
      ok += 1;
      log(`  ✔ ${l.titulo}`);
    } else {
      log(`  · sin portada: ${l.titulo}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return { revisados: libros.length, completados: ok };
}

module.exports = { buscarPortada, completarPortadasFaltantes };
