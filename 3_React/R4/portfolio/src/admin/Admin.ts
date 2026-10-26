// ============================================================
//  PANEL DE ADMINISTRACIÓN  (/#admin)
// ------------------------------------------------------------
//  - Login con usuario y contraseña (guardados en la tabla admin_usuarios)
//  - Mensajes del formulario de contacto
//  - Editar perfil, habilidades, experiencia y proyectos
//  - Cambiar la contraseña
// ============================================================
import { CATEGORIAS, Content, esc, lines } from '../lib/content';
import { toast } from '../lib/toast';

// ---------- Tipos ----------
interface Mensaje {
  id: number;
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
  leido: number | boolean;
  creado_en: string;
}

type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'url';
  options?: Array<[string, string]>;
  hint?: string;
  required?: boolean;
  rows?: number;
};

type ResourceKey = 'habilidades' | 'experiencias' | 'proyectos';

const RESOURCES: Record<
  ResourceKey,
  { title: string; singular: string; intro: string; fields: FieldDef[]; summary: (r: any) => [string, string] }
> = {
  habilidades: {
    title: 'Habilidades',
    singular: 'habilidad',
    intro: 'Se muestran agrupadas por categoría, en el orden de esta lista.',
    fields: [
      { name: 'nombre', label: 'Nombre', required: true },
      {
        name: 'nivel',
        label: 'Nivel',
        type: 'select',
        options: [
          ['1', '1 · Recién empiezo'],
          ['2', '2 · Lo básico'],
          ['3', '3 · Me defiendo'],
          ['4', '4 · Lo uso seguido'],
          ['5', '5 · Lo manejo muy bien'],
        ],
      },
      { name: 'categoria', label: 'Categoría', type: 'select', options: Object.entries(CATEGORIAS) },
    ],
    summary: r => [r.nombre, `${CATEGORIAS[r.categoria] || r.categoria} · nivel ${r.nivel}/5`],
  },
  experiencias: {
    title: 'Experiencia',
    singular: 'experiencia',
    intro: 'Aparecen en la línea de tiempo en este orden. Poné la más reciente arriba.',
    fields: [
      { name: 'titulo', label: 'Título', required: true },
      { name: 'lugar', label: 'Dónde o en qué contexto', hint: 'Ej.: Proyecto escolar de 5° año' },
      { name: 'fecha', label: 'Fecha', hint: 'Ej.: 2025 - presente' },
      { name: 'descripcion', label: 'Qué hiciste', type: 'textarea', rows: 4, hint: 'Una cosa por línea.' },
      { name: 'tecnologias', label: 'Tecnologías', hint: 'Separadas por coma: HTML, CSS, JavaScript' },
    ],
    summary: r => [r.titulo, [r.lugar, r.fecha].filter(Boolean).join(' · ')],
  },
  proyectos: {
    title: 'Proyectos',
    singular: 'proyecto',
    intro: 'Cada proyecto es una tarjeta en la página, en este orden.',
    fields: [
      { name: 'nombre', label: 'Nombre', required: true },
      { name: 'fecha', label: 'Fecha', hint: 'Ej.: 2026' },
      { name: 'descripcion', label: 'Descripción corta', type: 'textarea', rows: 2 },
      { name: 'caracteristicas', label: 'Qué tiene', type: 'textarea', rows: 4, hint: 'Una característica por línea.' },
      { name: 'tecnologias', label: 'Tecnologías', hint: 'Separadas por coma.' },
      { name: 'github', label: 'Link al código (GitHub)', type: 'url', hint: 'Opcional. Empieza con https://' },
      { name: 'link', label: 'Link a la demo', type: 'url', hint: 'Opcional. Empieza con https://' },
    ],
    summary: r => [r.nombre, [r.fecha, r.tecnologias].filter(Boolean).join(' · ')],
  },
};

const PERFIL_GROUPS: Array<{ title: string; hint?: string; fields: FieldDef[] }> = [
  {
    title: 'Portada',
    fields: [
      { name: 'nombre', label: 'Nombre' },
      { name: 'rol', label: 'Qué hacés', hint: 'Aparece arriba de tu nombre.' },
      { name: 'intro', label: 'Frase de presentación', type: 'textarea', rows: 2 },
    ],
  },
  {
    title: 'Sobre mí',
    hint: 'Para poner algo en negrita, escribilo entre dobles asteriscos: **así**. Si dejás un párrafo vacío, no se muestra.',
    fields: [
      { name: 'about_p1', label: 'Párrafo 1', type: 'textarea', rows: 3 },
      { name: 'about_p2', label: 'Párrafo 2', type: 'textarea', rows: 3 },
      { name: 'about_p3', label: 'Párrafo 3', type: 'textarea', rows: 3 },
    ],
  },
  {
    title: 'Números',
    hint: 'Si dejás el número vacío, ese dato no se muestra.',
    fields: [
      { name: 'stat_years', label: 'Número 1' },
      { name: 'stat_years_label', label: 'Texto 1' },
      { name: 'stat_projects', label: 'Número 2' },
      { name: 'stat_projects_label', label: 'Texto 2' },
      { name: 'stat_techs', label: 'Número 3' },
      { name: 'stat_techs_label', label: 'Texto 3' },
    ],
  },
  {
    title: 'Contacto',
    fields: [
      { name: 'email', label: 'Email' },
      { name: 'ubicacion', label: 'Ubicación' },
      { name: 'github', label: 'GitHub', type: 'url' },
      { name: 'linkedin', label: 'LinkedIn', type: 'url', hint: 'Opcional.' },
    ],
  },
];

type View = 'mensajes' | 'perfil' | ResourceKey | 'cuenta';

const NAV: Array<[View, string]> = [
  ['mensajes', 'Mensajes'],
  ['perfil', 'Perfil'],
  ['habilidades', 'Habilidades'],
  ['experiencias', 'Experiencia'],
  ['proyectos', 'Proyectos'],
  ['cuenta', 'Cuenta'],
];

// ---------- Estado ----------
let root: HTMLElement;
let token: string | null = null;
let username = '';

const storage = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
  del: (k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};

// ---------- Llamadas a la API ----------
class SessionError extends Error {}

async function api<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/admin/login') {
    logout('Tu sesión expiró. Iniciá sesión de nuevo.');
    throw new SessionError();
  }
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data as T;
}

function fail(err: unknown) {
  if (err instanceof SessionError) return;
  toast(err instanceof Error ? err.message : 'Algo salió mal.', 'error');
}

// ============================================================
//  ENTRADA
// ============================================================
export function renderAdmin(container: HTMLElement): void {
  root = container;
  token = storage.get('adminToken');
  username = storage.get('adminUsername') || '';
  if (token) renderShell();
  else renderLogin();
}

function logout(message?: string) {
  token = null;
  storage.del('adminToken');
  storage.del('adminUsername');
  renderLogin(message);
}

// ============================================================
//  LOGIN
// ============================================================
function renderLogin(message?: string) {
  root.innerHTML = `
    <div class="adm-login-wrap">
      <form class="adm-login" novalidate>
        <h1>Panel de admin</h1>
        <p class="adm-muted">Entrá para editar tu portfolio y leer los mensajes.</p>
        ${message ? `<p class="adm-alert">${esc(message)}</p>` : ''}
        <label class="adm-field">
          <span>Usuario</span>
          <input name="username" autocomplete="username" required />
        </label>
        <label class="adm-field">
          <span>Contraseña</span>
          <input name="password" type="password" autocomplete="current-password" required />
        </label>
        <p class="adm-error" aria-live="polite"></p>
        <button class="btn btn-primary" type="submit">Iniciar sesión</button>
        <a class="adm-back" href="/">Volver al portfolio</a>
      </form>
    </div>
  `;

  const form = root.querySelector('form') as HTMLFormElement;
  const error = root.querySelector('.adm-error') as HTMLElement;
  const btn = form.querySelector('button') as HTMLButtonElement;
  (form.elements.namedItem('username') as HTMLInputElement).focus();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const u = String(fd.get('username') || '').trim();
    const p = String(fd.get('password') || '');
    if (!u || !p) {
      error.textContent = 'Completá usuario y contraseña.';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Entrando...';
    error.textContent = '';
    try {
      const data = await api<{ token: string; username: string }>('/admin/login', 'POST', {
        username: u,
        password: p,
      });
      token = data.token;
      username = data.username;
      storage.set('adminToken', token);
      storage.set('adminUsername', username);
      renderShell();
    } catch (err: any) {
      error.textContent =
        err?.message === 'Failed to fetch'
          ? 'No se pudo conectar con el servidor. ¿Está corriendo la API?'
          : err?.message || 'No se pudo iniciar sesión.';
      btn.disabled = false;
      btn.textContent = 'Iniciar sesión';
    }
  });
}

// ============================================================
//  ESTRUCTURA DEL PANEL
// ============================================================
let currentView: View = 'mensajes';

function renderShell() {
  root.innerHTML = `
    <div class="adm">
      <aside class="adm-side">
        <div class="adm-brand">
          <strong>Panel</strong>
          <span>${esc(username)}</span>
        </div>
        <nav class="adm-nav">
          ${NAV.map(
            ([v, label]) =>
              `<button data-view="${v}">${label}${v === 'mensajes' ? '<span class="adm-badge" hidden></span>' : ''}</button>`
          ).join('')}
        </nav>
        <div class="adm-side-foot">
          <a href="/" target="_blank" rel="noopener">Ver portfolio</a>
          <button class="adm-logout">Cerrar sesión</button>
        </div>
      </aside>
      <main class="adm-main" tabindex="-1"></main>
    </div>
    <dialog class="adm-dialog"></dialog>
  `;

  root.querySelectorAll<HTMLButtonElement>('.adm-nav button').forEach(b =>
    b.addEventListener('click', () => show(b.dataset.view as View))
  );
  root.querySelector('.adm-logout')!.addEventListener('click', () => logout());

  // Verificar que el token guardado siga siendo válido
  api('/admin/me').catch(fail);
  show(currentView);
}

function show(view: View) {
  currentView = view;
  root.querySelectorAll<HTMLButtonElement>('.adm-nav button').forEach(b =>
    b.classList.toggle('active', b.dataset.view === view)
  );
  const main = root.querySelector('.adm-main') as HTMLElement;
  main.innerHTML = `<p class="adm-loading">Cargando...</p>`;

  if (view === 'mensajes') renderMensajes(main);
  else if (view === 'perfil') renderPerfil(main);
  else if (view === 'cuenta') renderCuenta(main);
  else renderResource(main, view);
}

function updateBadge(unread: number) {
  const badge = root.querySelector('.adm-badge') as HTMLElement | null;
  if (!badge) return;
  badge.hidden = unread === 0;
  badge.textContent = String(unread);
}

// ============================================================
//  MENSAJES
// ============================================================
let soloSinLeer = false;

async function renderMensajes(main: HTMLElement) {
  let msgs: Mensaje[];
  try {
    msgs = await api<Mensaje[]>('/admin/contactos');
  } catch (err) {
    main.innerHTML = `<p class="adm-alert">No se pudieron cargar los mensajes. Revisá la conexión con la base de datos.</p>`;
    return fail(err);
  }
  const unread = msgs.filter(m => !m.leido).length;
  updateBadge(unread);
  const list = soloSinLeer ? msgs.filter(m => !m.leido) : msgs;

  main.innerHTML = `
    <header class="adm-head">
      <div>
        <h1>Mensajes</h1>
        <p class="adm-muted">${msgs.length} en total, ${unread} sin leer.</p>
      </div>
      <label class="adm-switch"><input type="checkbox" ${soloSinLeer ? 'checked' : ''} /> Solo sin leer</label>
    </header>
    ${
      list.length === 0
        ? `<div class="adm-empty">
            <h2>${msgs.length ? 'No hay mensajes sin leer' : 'Todavía no llegó ningún mensaje'}</h2>
            <p>Cuando alguien complete el formulario de contacto del portfolio, lo vas a ver acá.</p>
          </div>`
        : `<ul class="adm-msgs">
            ${list
              .map(
                m => `
              <li class="adm-msg ${m.leido ? '' : 'unread'}" data-id="${m.id}">
                <div class="adm-msg-head">
                  <h3>${esc(m.asunto)}</h3>
                  <time>${formatDate(m.creado_en)}</time>
                </div>
                <p class="adm-msg-from">${esc(m.nombre)} &lt;${esc(m.email)}&gt;</p>
                <p class="adm-msg-body">${esc(m.mensaje)}</p>
                <div class="adm-actions">
                  <a class="btn btn-small" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: ' + m.asunto)}">Responder</a>
                  <button class="btn btn-small btn-ghost" data-act="read">${m.leido ? 'Marcar sin leer' : 'Marcar leído'}</button>
                  <button class="btn btn-small btn-danger" data-act="delete">Eliminar</button>
                </div>
              </li>`
              )
              .join('')}
          </ul>`
    }
  `;

  main.querySelector('.adm-switch input')!.addEventListener('change', e => {
    soloSinLeer = (e.target as HTMLInputElement).checked;
    renderMensajes(main);
  });

  main.querySelectorAll<HTMLButtonElement>('[data-act]').forEach(btn =>
    btn.addEventListener('click', async () => {
      const li = btn.closest('li') as HTMLElement;
      const id = Number(li.dataset.id);
      const msg = msgs.find(m => m.id === id)!;
      try {
        if (btn.dataset.act === 'read') {
          await api(`/admin/contactos/${id}`, 'PATCH', { leido: !msg.leido });
        } else {
          if (!(await confirmDialog(`¿Eliminar el mensaje de ${msg.nombre}?`, 'Eliminar mensaje'))) return;
          await api(`/admin/contactos/${id}`, 'DELETE');
          toast('Mensaje eliminado.');
        }
        renderMensajes(main);
      } catch (err) {
        fail(err);
      }
    })
  );
}

// ============================================================
//  PERFIL
// ============================================================
async function renderPerfil(main: HTMLElement) {
  let content: Content;
  try {
    content = await api<Content>('/admin/contenido');
  } catch (err) {
    main.innerHTML = `<p class="adm-alert">No se pudo cargar el perfil.</p>`;
    return fail(err);
  }
  const p = content.perfil;

  main.innerHTML = `
    <header class="adm-head">
      <div>
        <h1>Perfil</h1>
        <p class="adm-muted">Los textos generales de tu portfolio.</p>
      </div>
    </header>
    <form class="adm-form">
      ${PERFIL_GROUPS.map(
        g => `
        <fieldset class="adm-card">
          <legend>${g.title}</legend>
          ${g.hint ? `<p class="adm-muted">${esc(g.hint)}</p>` : ''}
          <div class="adm-fields ${g.title === 'Números' || g.title === 'Contacto' ? 'cols-2' : ''}">
            ${g.fields.map(f => fieldHTML(f, p[f.name] ?? '')).join('')}
          </div>
        </fieldset>`
      ).join('')}
      <div class="adm-savebar">
        <button class="btn btn-primary" type="submit">Guardar perfil</button>
      </div>
    </form>
  `;

  const form = main.querySelector('form') as HTMLFormElement;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    try {
      await api('/admin/perfil', 'PUT', Object.fromEntries(new FormData(form).entries()));
      toast('Perfil guardado.');
    } catch (err) {
      fail(err);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar perfil';
    }
  });
}

// ============================================================
//  HABILIDADES / EXPERIENCIA / PROYECTOS
// ============================================================
async function renderResource(main: HTMLElement, key: ResourceKey) {
  const cfg = RESOURCES[key];
  let rows: any[];
  try {
    rows = (await api<Content>('/admin/contenido'))[key] as any[];
  } catch (err) {
    main.innerHTML = `<p class="adm-alert">No se pudo cargar la lista.</p>`;
    return fail(err);
  }

  main.innerHTML = `
    <header class="adm-head">
      <div>
        <h1>${cfg.title}</h1>
        <p class="adm-muted">${cfg.intro}</p>
      </div>
      <button class="btn btn-primary" data-act="add">Agregar ${cfg.singular}</button>
    </header>
    ${
      rows.length === 0
        ? `<div class="adm-empty"><h2>La lista está vacía</h2><p>Agregá la primera ${cfg.singular} con el botón de arriba.</p></div>`
        : `<ol class="adm-list">
            ${rows
              .map((r, i) => {
                const [title, sub] = cfg.summary(r);
                return `
              <li data-id="${r.id}">
                <div class="adm-list-text">
                  <strong>${esc(title)}</strong>
                  <span>${esc(sub)}</span>
                </div>
                <div class="adm-actions">
                  <button class="btn-icon" data-act="up" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>↑</button>
                  <button class="btn-icon" data-act="down" aria-label="Bajar" ${i === rows.length - 1 ? 'disabled' : ''}>↓</button>
                  <button class="btn btn-small btn-ghost" data-act="edit">Editar</button>
                  <button class="btn btn-small btn-danger" data-act="delete">Eliminar</button>
                </div>
              </li>`;
              })
              .join('')}
          </ol>`
    }
  `;

  const reload = () => renderResource(main, key);

  main.querySelector('[data-act=add]')!.addEventListener('click', async () => {
    const values = await formDialog(`Agregar ${cfg.singular}`, cfg.fields, {}, `Agregar ${cfg.singular}`);
    if (!values) return;
    try {
      await api(`/admin/${key}`, 'POST', values);
      toast(key === 'proyectos' ? 'Proyecto agregado.' : `${capitalize(cfg.singular)} agregada.`);
      reload();
    } catch (err) {
      fail(err);
    }
  });

  main.querySelectorAll<HTMLButtonElement>('.adm-list [data-act]').forEach(btn =>
    btn.addEventListener('click', async () => {
      const id = Number((btn.closest('li') as HTMLElement).dataset.id);
      const index = rows.findIndex(r => r.id === id);
      const row = rows[index];
      try {
        switch (btn.dataset.act) {
          case 'edit': {
            const values = await formDialog(`Editar ${cfg.singular}`, cfg.fields, row, 'Guardar cambios');
            if (!values) return;
            await api(`/admin/${key}/${id}`, 'PUT', values);
            toast('Cambios guardados.');
            break;
          }
          case 'delete': {
            const [title] = cfg.summary(row);
            if (!(await confirmDialog(`¿Eliminar "${title}"? No se puede deshacer.`, `Eliminar ${cfg.singular}`))) return;
            await api(`/admin/${key}/${id}`, 'DELETE');
            toast('Eliminado.');
            break;
          }
          case 'up':
          case 'down': {
            const to = btn.dataset.act === 'up' ? index - 1 : index + 1;
            const ids = rows.map(r => r.id);
            [ids[index], ids[to]] = [ids[to], ids[index]];
            await api(`/admin/${key}/orden`, 'PUT', { ids });
            break;
          }
        }
        reload();
      } catch (err) {
        fail(err);
      }
    })
  );
}

// ============================================================
//  CUENTA
// ============================================================
function renderCuenta(main: HTMLElement) {
  main.innerHTML = `
    <header class="adm-head">
      <div>
        <h1>Cuenta</h1>
        <p class="adm-muted">Entraste como <strong>${esc(username)}</strong>.</p>
      </div>
    </header>
    <form class="adm-card adm-form narrow" novalidate>
      <h2>Cambiar contraseña</h2>
      <label class="adm-field"><span>Contraseña actual</span>
        <input name="actual" type="password" autocomplete="current-password" required /></label>
      <label class="adm-field"><span>Contraseña nueva</span>
        <input name="nueva" type="password" autocomplete="new-password" minlength="8" required />
        <small>Al menos 8 caracteres.</small></label>
      <label class="adm-field"><span>Repetí la contraseña nueva</span>
        <input name="repetir" type="password" autocomplete="new-password" required /></label>
      <p class="adm-error" aria-live="polite"></p>
      <button class="btn btn-primary" type="submit">Cambiar contraseña</button>
    </form>
  `;
  const form = main.querySelector('form') as HTMLFormElement;
  const error = form.querySelector('.adm-error') as HTMLElement;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const nueva = String(fd.get('nueva'));
    error.textContent = '';
    if (nueva.length < 8) return void (error.textContent = 'La contraseña nueva necesita al menos 8 caracteres.');
    if (nueva !== fd.get('repetir')) return void (error.textContent = 'Las contraseñas nuevas no coinciden.');
    try {
      await api('/admin/password', 'PUT', { actual: fd.get('actual'), nueva });
      form.reset();
      toast('Contraseña cambiada.');
    } catch (err: any) {
      if (!(err instanceof SessionError)) error.textContent = err.message;
    }
  });
}

// ============================================================
//  DIÁLOGOS
// ============================================================
function fieldHTML(f: FieldDef, value: unknown): string {
  const v = esc(value ?? '');
  const id = `f-${f.name}-${Math.random().toString(36).slice(2, 7)}`;
  let control: string;
  if (f.type === 'textarea') {
    control = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 3}" ${f.required ? 'required' : ''}>${v}</textarea>`;
  } else if (f.type === 'select') {
    control = `<select id="${id}" name="${f.name}">${(f.options || [])
      .map(([val, label]) => `<option value="${esc(val)}" ${String(value) === val ? 'selected' : ''}>${esc(label)}</option>`)
      .join('')}</select>`;
  } else {
    control = `<input id="${id}" name="${f.name}" type="${f.type === 'url' ? 'url' : 'text'}" value="${v}" ${
      f.type === 'url' ? 'placeholder="https://"' : ''
    } ${f.required ? 'required' : ''} />`;
  }
  return `
    <div class="adm-field">
      <label for="${id}">${esc(f.label)}</label>
      ${control}
      ${f.hint ? `<small>${esc(f.hint)}</small>` : ''}
    </div>`;
}

function formDialog(
  title: string,
  fields: FieldDef[],
  values: Record<string, any>,
  submitLabel: string
): Promise<Record<string, string> | null> {
  const dialog = root.querySelector('.adm-dialog') as HTMLDialogElement;
  dialog.innerHTML = `
    <form method="dialog" class="adm-dialog-form" novalidate>
      <h2>${esc(title)}</h2>
      <div class="adm-fields">${fields.map(f => fieldHTML(f, values[f.name] ?? (f.type === 'select' ? f.options?.[0]?.[0] : ''))).join('')}</div>
      <p class="adm-error" aria-live="polite"></p>
      <div class="adm-dialog-actions">
        <button type="button" class="btn btn-ghost" value="cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary">${esc(submitLabel)}</button>
      </div>
    </form>`;

  return new Promise(resolve => {
    const form = dialog.querySelector('form') as HTMLFormElement;
    const error = dialog.querySelector('.adm-error') as HTMLElement;
    let result: Record<string, string> | null = null;

    dialog.querySelector('[value=cancel]')!.addEventListener('click', () => dialog.close());
    form.addEventListener('submit', e => {
      const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
      const missing = fields.find(f => f.required && !String(data[f.name] || '').trim());
      if (missing) {
        e.preventDefault();
        error.textContent = `Completá "${missing.label}".`;
        return;
      }
      const badUrl = fields.find(f => f.type === 'url' && data[f.name] && !/^https?:\/\//.test(data[f.name].trim()));
      if (badUrl) {
        e.preventDefault();
        error.textContent = `"${badUrl.label}" tiene que empezar con https://`;
        return;
      }
      // Limpiar líneas vacías de los textarea
      fields.filter(f => f.type === 'textarea').forEach(f => (data[f.name] = lines(data[f.name]).join('\n')));
      result = data;
    });
    dialog.addEventListener('close', () => resolve(result), { once: true });
    dialog.showModal();
    (dialog.querySelector('input, textarea, select') as HTMLElement)?.focus();
  });
}

function confirmDialog(message: string, confirmLabel: string): Promise<boolean> {
  const dialog = root.querySelector('.adm-dialog') as HTMLDialogElement;
  dialog.innerHTML = `
    <form method="dialog" class="adm-dialog-form small">
      <p>${esc(message)}</p>
      <div class="adm-dialog-actions">
        <button value="no" class="btn btn-ghost">Cancelar</button>
        <button value="yes" class="btn btn-danger">${esc(confirmLabel)}</button>
      </div>
    </form>`;
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'yes'), { once: true });
    dialog.returnValue = '';
    dialog.showModal();
  });
}

// ---------- Utilidades ----------
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function formatDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
