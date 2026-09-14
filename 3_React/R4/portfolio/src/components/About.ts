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
            Hola, soy Gaia Foresi, estudiante de 7°mo año de la escuela de educacion secundaria técnica N°5
            con especialización en la tecnicatura de Informática.
          </p>
          <p>
            Actualmente estoy aprendiendo <strong>TypeScript, JavaScript, Node.js, React, HTML y CSS</strong>, ademas de
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