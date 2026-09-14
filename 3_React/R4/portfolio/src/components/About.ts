//Crea la sección, le pone el contenido, controla la foto, activa la animación al hacer scroll y la devuelve.
export function About(): HTMLElement {
  const section = document.createElement('section');
  section.id = 'about';
  section.className = 'section';
  
  // Contenido de la sección
  section.innerHTML = `
    <div class="about-content">
      <h2>Sobre Mí</h2>
      <div class="about-grid">
        <div class="about-text">
          <p>
            👋 ¡Hola! Soy estudiante de <strong>último año de secundaria técnica</strong> 
            con especialización en desarrollo de software. Me apasiona crear soluciones 
            tecnológicas que resuelvan problemas reales y mejorar mis habilidades constantemente.
          </p>
          <p>
            💻 Actualmente me especializo en <strong>TypeScript, JavaScript, Node.js</strong> 
            y bases de datos SQL. También tengo experiencia con Python, Docker y Git para 
            control de versiones.
          </p>
          <p>
            🎯 Mi objetivo es convertirme en un desarrollador full-stack y contribuir a 
            proyectos que tengan un impacto positivo en la sociedad.
          </p>
          <div class="about-stats">
            <div class="stat">
              <span class="stat-number">2+</span>
              <span class="stat-label">Años de experiencia</span>
            </div>
            <div class="stat">
              <span class="stat-number">10+</span>
              <span class="stat-label">Proyectos completados</span>
            </div>
            <div class="stat">
              <span class="stat-number">5</span>
              <span class="stat-label">Tecnologías dominadas</span>
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
            <div class="placeholder-foto" style="display: none;">👨‍💻</div>
          </div>
        </div>
      </div>
    </div>
  `;

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