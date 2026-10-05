// ========== INTERFACES ==========
interface ContentRow {
  seccion: string;
  clave: string;
  valor: string;
}

// ========== COMPONENTE ==========
export function About(): HTMLElement {
  const section = document.createElement('section');
  section.id = 'about';
  section.className = 'section';

  // Contenido por defecto (mientras carga)
  section.innerHTML = `
    <div class="about-content">
      <h2>Sobre Mí</h2>
      <div class="about-grid">
        <div class="about-text">
          <p>
            Hola, soy Gaia Foresi, estudiante de 7°mo año de la escuela de educacion secundaria técnica N°5
            con especialización en la tecnicatura de Informática.
          </p>
          <p>
            Actualmente estoy aprendiendo <strong>C++, Java,TypeScript, JavaScript, Node.js, React, HTML y CSS</strong>, ademas de
            bases de datos SQL</strong>.
          </p>
          <p>
            Mi objetivo es poder crear paginas y aplicaciones web tanto utiles como divertidas para diversos sectores.
          </p>
          <div class="about-stats">
            <div class="stat">
              <span class="stat-number">3</span>
              <span class="stat-label">Años de experiencia</span>
            </div>
            <div class="stat">
              <span class="stat-number">5</span>
              <span class="stat-label">Proyectos completados</span>
            </div>
          </div>
        </div>
        <div class="about-image">
          <div class="foto-container">
            <img 
              src="/foto-perfil.jpg" 
              alt="Mi foto de perfil" 
              class="foto-img"
              onerror="this.style.display='none'; (this.nextElementSibling as HTMLElement).style.display='flex';"
            />
          </div>
        </div>
      </div>
    </div>
  `;

  // Cargar contenido desde TiDB
  loadAboutContent(section);

  // Observer para animación al hacer scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        section.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { 
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  observer.observe(section);

  return section;
}

// ========== CARGAR CONTENIDO DESDE TIDB ==========
async function loadAboutContent(section: HTMLElement): Promise<void> {
  try {
    const response = await fetch('/api/contenido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return;

    const rows: ContentRow[] = await response.json();

    // Crear mapa de búsqueda rápida
    const map: Record<string, string> = {};
    rows.forEach(row => {
      map[`${row.seccion}.${row.clave}`] = row.valor;
    });

    // Actualizar los textos si existen en TiDB
    const p1 = section.querySelector('#about-p1');
    const p2 = section.querySelector('#about-p2');
    const p3 = section.querySelector('#about-p3');
    const statYears = section.querySelector('#stat-years');
    const statProjects = section.querySelector('#stat-projects');
    const statTechs = section.querySelector('#stat-techs');

    if (p1 && map['about.p1']) p1.innerHTML = map['about.p1'];
    if (p2 && map['about.p2']) p2.innerHTML = map['about.p2'];
    if (p3 && map['about.p3']) p3.innerHTML = map['about.p3'];
    if (statYears && map['stats.years']) statYears.textContent = map['stats.years'];
    if (statProjects && map['stats.projects']) statProjects.textContent = map['stats.projects'];
    if (statTechs && map['stats.techs']) statTechs.textContent = map['stats.techs'];

  } catch (error) {
    console.error('Error al cargar contenido de About:', error);
  }
}