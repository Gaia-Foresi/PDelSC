// ========== INTERFACES ==========
interface LoginResponse {
  token: string;
  username: string;
}

interface ContactMessage {
  id: number;
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
  creado_en: string;
}

// ========== ESTADO GLOBAL ==========
let currentToken: string | null = null;
let currentUsername: string | null = null;

// ========== FUNCIÓN PRINCIPAL ==========
export function renderAdmin(container: HTMLElement): void {
  container.innerHTML = '';

  const savedToken = localStorage.getItem('adminToken');
  const savedUsername = localStorage.getItem('adminUsername');

  if (savedToken && savedUsername) {
    currentToken = savedToken;
    currentUsername = savedUsername;
    renderDashboard(container);
  } else {
    renderLogin(container);
  }
}

// ========== LOGIN ==========
function renderLogin(container: HTMLElement): void {
  const loginDiv = document.createElement('div');
  loginDiv.className = 'admin-login';

  loginDiv.innerHTML = `
    <h1>🔐 Panel de Admin</h1>
    <form id="adminLoginForm">
      <div>
        <label for="username">Usuario</label>
        <input type="text" id="username" name="username" required placeholder="admin" />
      </div>
      <div>
        <label for="password">Contraseña</label>
        <input type="password" id="password" name="password" required placeholder="••••••••" />
      </div>
      <div id="loginError"></div>
      <button type="submit" id="loginBtn">Iniciar sesión</button>
    </form>
  `;

  container.appendChild(loginDiv);

  const form = loginDiv.querySelector('#adminLoginForm') as HTMLFormElement;
  const errorDiv = loginDiv.querySelector('#loginError') as HTMLDivElement;
  const submitBtn = loginDiv.querySelector('#loginBtn') as HTMLButtonElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando...';
    errorDiv.innerHTML = '';

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Credenciales inválidas');
      }

      const data: LoginResponse = await response.json();
      
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUsername', data.username);

      currentToken = data.token;
      currentUsername = data.username;

      container.innerHTML = '';
      renderDashboard(container);

    } catch (error) {
      errorDiv.innerHTML = `<div class="admin-error">❌ Usuario o contraseña incorrectos</div>`;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Iniciar sesión';
    }
  });
}

// ========== DASHBOARD ==========
function renderDashboard(container: HTMLElement): void {
  const dashboard = document.createElement('div');
  dashboard.className = 'admin-container';

  dashboard.innerHTML = `
    <div class="admin-header">
      <h1>🚀 Panel de Admin</h1>
      <div>
        <span class="admin-user">👤 ${currentUsername}</span>
        <button class="admin-logout" id="logoutBtn">Cerrar sesión</button>
      </div>
    </div>

    <div class="admin-dashboard">
      <div class="admin-tabs">
        <button class="admin-tab active" data-tab="messages">📬 Mensajes de Contacto</button>
        <button class="admin-tab" data-tab="content">📝 Editar Contenido</button>
      </div>

      <div class="admin-tab-content" id="tabContent"></div>
    </div>
  `;

  container.appendChild(dashboard);

  const logoutBtn = dashboard.querySelector('#logoutBtn') as HTMLButtonElement;
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    currentToken = null;
    currentUsername = null;
    container.innerHTML = '';
    renderLogin(container);
  });

  const tabs = dashboard.querySelectorAll('.admin-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.getAttribute('data-tab');
      if (tabName === 'messages') {
        loadMessages(dashboard);
      } else if (tabName === 'content') {
        loadContentEditor(dashboard);
      }
    });
  });

  loadMessages(dashboard);
}

// ========== CARGAR MENSAJES ==========
async function loadMessages(dashboard: HTMLElement): Promise<void> {
  const tabContent = dashboard.querySelector('#tabContent') as HTMLDivElement;
  tabContent.innerHTML = '<p style="text-align:center;padding:40px;">Cargando mensajes...</p>';

  try {
    const response = await fetch('/api/admin/contactos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al cargar mensajes');
    }

    const messages: ContactMessage[] = await response.json();

    if (messages.length === 0) {
      tabContent.innerHTML = `
        <div class="admin-empty">
          <div class="admin-empty-icon">📭</div>
          <h3>No hay mensajes todavía</h3>
          <p>Cuando alguien complete el formulario de contacto, aparecerá acá.</p>
        </div>
      `;
      return;
    }

    const messagesHTML = messages.map(msg => `
      <div class="admin-message">
        <div class="admin-message-header">
          <h3>${escapeHtml(msg.asunto)}</h3>
          <span class="admin-message-date">${formatDate(msg.creado_en)}</span>
        </div>
        <div class="admin-message-info">
          📧 ${escapeHtml(msg.email)} &nbsp;|&nbsp; 👤 ${escapeHtml(msg.nombre)}
        </div>
        <div class="admin-message-body">${escapeHtml(msg.mensaje)}</div>
      </div>
    `).join('');

    tabContent.innerHTML = `<div class="admin-messages">${messagesHTML}</div>`;

  } catch (error) {
    tabContent.innerHTML = `<div class="admin-error">❌ Error al cargar los mensajes. Cerrá sesión y volvé a entrar.</div>`;
  }
}

// ========== EDITOR DE CONTENIDO ==========
function loadContentEditor(dashboard: HTMLElement): void {
  const tabContent = dashboard.querySelector('#tabContent') as HTMLDivElement;
  
  tabContent.innerHTML = `
    <div class="admin-editor">
      <div class="admin-editor-section">
        <h2>📝 Sobre Mí</h2>
        <p class="admin-editor-hint">Editá el texto que aparece en la sección "Sobre Mí" del portfolio.</p>
        <div class="admin-form-group">
          <label>Párrafo 1</label>
          <textarea id="about-p1" rows="3" placeholder="Soy estudiante de..."></textarea>
        </div>
        <div class="admin-form-group">
          <label>Párrafo 2</label>
          <textarea id="about-p2" rows="3" placeholder="Actualmente me especializo en..."></textarea>
        </div>
        <div class="admin-form-group">
          <label>Párrafo 3</label>
          <textarea id="about-p3" rows="3" placeholder="Mi objetivo es..."></textarea>
        </div>
        <button class="admin-save-btn" id="saveAbout">Guardar Sobre Mí</button>
      </div>

      <div class="admin-editor-section">
        <h2>📊 Estadísticas</h2>
        <p class="admin-editor-hint">Los 3 números que aparecen en "Sobre Mí".</p>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label>Años de experiencia</label>
            <input type="text" id="stat-years" placeholder="2+" />
          </div>
          <div class="admin-form-group">
            <label>Proyectos completados</label>
            <input type="text" id="stat-projects" placeholder="10+" />
          </div>
          <div class="admin-form-group">
            <label>Tecnologías dominadas</label>
            <input type="text" id="stat-techs" placeholder="5" />
          </div>
        </div>
        <button class="admin-save-btn" id="saveStats">Guardar Estadísticas</button>
      </div>

      <div class="admin-editor-section">
        <h2>🛠️ Habilidades</h2>
        <p class="admin-editor-hint">Una habilidad por línea, con formato: <code>Nombre | Nivel(1-5) | Categoría</code></p>
        <p class="admin-editor-hint">Categorías válidas: <code>frontend</code>, <code>backend</code>, <code>database</code>, <code>tools</code>, <code>soft</code></p>
        <div class="admin-form-group">
          <textarea id="skills-list" rows="10" placeholder="JavaScript | 5 | frontend&#10;TypeScript | 4 | frontend&#10;Node.js | 4 | backend"></textarea>
        </div>
        <button class="admin-save-btn" id="saveSkills">Guardar Habilidades</button>
      </div>

      <div class="admin-editor-section">
        <h2>💼 Experiencia</h2>
        <p class="admin-editor-hint">Una experiencia por línea, con formato: <code>Título | Empresa | Fecha | Descripción</code></p>
        <div class="admin-form-group">
          <textarea id="experience-list" rows="8" placeholder="Desarrollador Freelance | Independiente | 2024 - Presente | Desarrollo de apps web"></textarea>
        </div>
        <button class="admin-save-btn" id="saveExperience">Guardar Experiencia</button>
      </div>

      <div class="admin-editor-section">
        <h2>🚀 Proyectos</h2>
        <p class="admin-editor-hint">Un proyecto por línea, con formato: <code>Nombre | Fecha | Descripción | Tecnologías (separadas por coma)</code></p>
        <div class="admin-form-group">
          <textarea id="projects-list" rows="8" placeholder="E-commerce | 2024 | Tienda online completa | React,Node.js,PostgreSQL"></textarea>
        </div>
        <button class="admin-save-btn" id="saveProjects">Guardar Proyectos</button>
      </div>
    </div>
  `;

  // Cargar los datos actuales
  loadCurrentContent(dashboard);

  // Asignar eventos a los botones de guardar
  const saveAbout = dashboard.querySelector('#saveAbout') as HTMLButtonElement;
  const saveStats = dashboard.querySelector('#saveStats') as HTMLButtonElement;
  const saveSkills = dashboard.querySelector('#saveSkills') as HTMLButtonElement;
  const saveExperience = dashboard.querySelector('#saveExperience') as HTMLButtonElement;
  const saveProjects = dashboard.querySelector('#saveProjects') as HTMLButtonElement;

  saveAbout.addEventListener('click', () => saveAboutContent(dashboard));
  saveStats.addEventListener('click', () => saveStatsContent(dashboard));
  saveSkills.addEventListener('click', () => saveSkillsContent(dashboard));
  saveExperience.addEventListener('click', () => saveExperienceContent(dashboard));
  saveProjects.addEventListener('click', () => saveProjectsContent(dashboard));
}

// ========== CARGAR CONTENIDO ACTUAL ==========
async function loadCurrentContent(dashboard: HTMLElement): Promise<void> {
  try {
    const response = await fetch('/api/admin/contenido/listar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
      },
    });

    if (!response.ok) return;

    const rows: Array<{ seccion: string; clave: string; valor: string }> = await response.json();

    // Crear un mapa para buscar fácil
    const contentMap: Record<string, string> = {};
    rows.forEach(row => {
      contentMap[`${row.seccion}.${row.clave}`] = row.valor;
    });

    // Rellenar los campos
    const aboutP1 = dashboard.querySelector('#about-p1') as HTMLTextAreaElement;
    const aboutP2 = dashboard.querySelector('#about-p2') as HTMLTextAreaElement;
    const aboutP3 = dashboard.querySelector('#about-p3') as HTMLTextAreaElement;
    const statYears = dashboard.querySelector('#stat-years') as HTMLInputElement;
    const statProjects = dashboard.querySelector('#stat-projects') as HTMLInputElement;
    const statTechs = dashboard.querySelector('#stat-techs') as HTMLInputElement;
    const skillsList = dashboard.querySelector('#skills-list') as HTMLTextAreaElement;
    const experienceList = dashboard.querySelector('#experience-list') as HTMLTextAreaElement;
    const projectsList = dashboard.querySelector('#projects-list') as HTMLTextAreaElement;

    if (aboutP1 && contentMap['about.p1']) aboutP1.value = contentMap['about.p1'];
    if (aboutP2 && contentMap['about.p2']) aboutP2.value = contentMap['about.p2'];
    if (aboutP3 && contentMap['about.p3']) aboutP3.value = contentMap['about.p3'];
    if (statYears && contentMap['stats.years']) statYears.value = contentMap['stats.years'];
    if (statProjects && contentMap['stats.projects']) statProjects.value = contentMap['stats.projects'];
    if (statTechs && contentMap['stats.techs']) statTechs.value = contentMap['stats.techs'];
    if (skillsList && contentMap['skills.list']) skillsList.value = contentMap['skills.list'];
    if (experienceList && contentMap['experience.list']) experienceList.value = contentMap['experience.list'];
    if (projectsList && contentMap['projects.list']) projectsList.value = contentMap['projects.list'];

  } catch (error) {
    console.error('Error al cargar contenido:', error);
  }
}

// ========== GUARDAR: SOBRE MÍ ==========
async function saveAboutContent(dashboard: HTMLElement): Promise<void> {
  const p1 = (dashboard.querySelector('#about-p1') as HTMLTextAreaElement).value;
  const p2 = (dashboard.querySelector('#about-p2') as HTMLTextAreaElement).value;
  const p3 = (dashboard.querySelector('#about-p3') as HTMLTextAreaElement).value;

  await saveContent('about', 'p1', p1);
  await saveContent('about', 'p2', p2);
  await saveContent('about', 'p3', p3);

  showAdminNotification('✅ Sobre Mí guardado');
}

// ========== GUARDAR: ESTADÍSTICAS ==========
async function saveStatsContent(dashboard: HTMLElement): Promise<void> {
  const years = (dashboard.querySelector('#stat-years') as HTMLInputElement).value;
  const projects = (dashboard.querySelector('#stat-projects') as HTMLInputElement).value;
  const techs = (dashboard.querySelector('#stat-techs') as HTMLInputElement).value;

  await saveContent('stats', 'years', years);
  await saveContent('stats', 'projects', projects);
  await saveContent('stats', 'techs', techs);

  showAdminNotification('✅ Estadísticas guardadas');
}

// ========== GUARDAR: HABILIDADES ==========
async function saveSkillsContent(dashboard: HTMLElement): Promise<void> {
  const value = (dashboard.querySelector('#skills-list') as HTMLTextAreaElement).value;
  await saveContent('skills', 'list', value);
  showAdminNotification('✅ Habilidades guardadas');
}

// ========== GUARDAR: EXPERIENCIA ==========
async function saveExperienceContent(dashboard: HTMLElement): Promise<void> {
  const value = (dashboard.querySelector('#experience-list') as HTMLTextAreaElement).value;
  await saveContent('experience', 'list', value);
  showAdminNotification('✅ Experiencia guardada');
}

// ========== GUARDAR: PROYECTOS ==========
async function saveProjectsContent(dashboard: HTMLElement): Promise<void> {
  const value = (dashboard.querySelector('#projects-list') as HTMLTextAreaElement).value;
  await saveContent('projects', 'list', value);
  showAdminNotification('✅ Proyectos guardados');
}

// ========== FUNCIÓN GENÉRICA: GUARDAR CONTENIDO ==========
async function saveContent(seccion: string, clave: string, valor: string): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/contenido', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
      },
      body: JSON.stringify({ seccion, clave, valor }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error al guardar:', error);
    return false;
  }
}

// ========== NOTIFICACIÓN EN EL PANEL ==========
function showAdminNotification(message: string): void {
  const notification = document.createElement('div');
  notification.textContent = message;
  Object.assign(notification.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '14px 24px',
    borderRadius: '10px',
    background: '#10b981',
    color: 'white',
    fontWeight: '600',
    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
    zIndex: '9999',
    opacity: '0',
    transition: 'opacity 0.3s ease',
  });

  document.body.appendChild(notification);
  setTimeout(() => notification.style.opacity = '1', 10);
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => document.body.removeChild(notification), 300);
  }, 2500);
}

// ========== UTILIDADES ==========
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}