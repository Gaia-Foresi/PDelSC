interface Project {
  name: string;
  date: string;
  description: string;
  technologies: string[];
  features?: string[];
  link?: string;
  github?: string;
}

//Crea el espacio donde se van a mostrar todos los proyectos
export function Projects(): HTMLElement {
  const section = document.createElement('section');
  section.id = 'projects';
  section.className = 'section';

  // Datos de proyectos
  const projects: Project[] = [
    {
      name: 'Pagina Informativa de Arduino',
      date: '2024',
      description: 'Página web informativa sobre Arduino, con secciones de piesas y proyectos.',
      technologies: ['HTML', 'CSS'],
      features: [
        'Sección de piezas de Arduino',
        'Sección de proyectos con ejemplos',
        'Imagenes y descripciones de cada proyecto',
      ],
    },
    {
      name: 'Diario Digital con Bootstrap',
      date: '2026',
      description: 'Diario digital informativo con diseño responsivo.',
      technologies: ['HTML', 'CSS', 'Bootstrap', 'JavaScript'],
      features: [
        'Diseño responsivo con Bootstrap',
        'Sección de noticias y artículos',
        'Formulario de contacto con validación',
      ],
    },
    {
      name: 'Videojuego de Snake rediseñado',
      date: '2026',
      description: 'Replica del clásico videojuego Snake con un nuevo diseño.',
      technologies: ['HTML', 'CSS', 'JavaScript'],
      features: [
        'Diseño moderno y responsivo',
        'Sprites hechos a mano y sonido de juego',
        'registro de juegadores y puntuaciones',
      ],
    }
  ];

  let projectsHTML = `
    <div class="projects-content">
      <h2>Proyectos Realizados</h2>
      <div class="projects-grid">
  `;

  //Agarra los proyectos uno por uno y crea una tarjeta para cada uno
  projects.forEach((project, index) => {
    const techs = project.technologies.map(tech => 
      `<span class="tech-tag">${tech}</span>`
    ).join('');

    //Agarra las características de cada proyecto y las convierte en una lista
    const features = project.features?.map(feature => 
      `<li>${feature}</li>`
    ).join('') || '';

    //Arma visualmente cada proyecto
    projectsHTML += `
      <div class="project-card" data-index="${index}">
        <div class="project-header">
          <h3>${project.name}</h3>
          <span class="project-date">${project.date}</span>
        </div>
        <p class="project-description">${project.description}</p>
        <div class="project-tech">${techs}</div>
        <div class="project-actions">
          <button class="btn-details" data-index="${index}">
            Ver detalles
          </button>
          <div class="project-links">
            ${project.github ? `<a href="${project.github}" target="_blank" class="btn-link">GitHub</a>` : ''}
            ${project.link ? `<a href="${project.link}" target="_blank" class="btn-link">Demo</a>` : ''}
          </div>
        </div>
        <div class="project-details" id="details-${index}" style="display: none;">
          <h4>Características:</h4>
          <ul class="features-list">
            ${features}
          </ul>
        </div>
      </div>
    `;
  });

  projectsHTML += `
      </div>
    </div>
  `;

  section.innerHTML = projectsHTML;

  //Agrega un evento de clic a la sección para controlar las interacciones con los botones de las tarjetas
  section.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Manejar clic en botón de detalles
    if (target.classList.contains('btn-details')) {
      const index = target.getAttribute('data-index');
      if (index !== null) {
        const details = document.getElementById(`details-${index}`);
        if (details) {
          const isHidden = details.style.display === 'none';
          details.style.display = isHidden ? 'block' : 'none';
          target.textContent = isHidden ? 'Ocultar detalles' : 'Ver detalles';
          
          // Animación smooth
          if (isHidden) {
            details.style.opacity = '0';
            details.style.transform = 'translateY(-10px)';
            setTimeout(() => {
              details.style.opacity = '1';
              details.style.transform = 'translateY(0)';
            }, 10);
          }
        }
      }
    }
  });

  //Vigila la sección mientras el usuario hace scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        section.classList.add('visible');
        
        // Animar cada tarjeta con delay
        const cards = section.querySelectorAll('.project-card');
        cards.forEach((card, index) => {
          setTimeout(() => {
            card.classList.add('visible');
          }, index * 150);
        });
        
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