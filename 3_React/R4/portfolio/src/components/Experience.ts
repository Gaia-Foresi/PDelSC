interface Experience {
  title: string;
  company: string;
  date: string;
  description: string[];
  technologies?: string[];
}

//Crea el lugar donde va a aparecer la sección Experiencia
export function Experience(): HTMLElement {
  const section = document.createElement('section');
  section.id = 'experience';
  section.className = 'section';

  //Guarda todos los datos de las experiencias en una lista
  const experiences: Experience[] = [
    {
      title: 'Desarrollo de E-commerce',
      company: 'Proyecto escolar de 5°to año',
      date: '2024',
      description: [
        'Desarrollo de un comercio electronico para una expocicicón escolar con tematica libre',
        'Implementación de carrusel, menu de navegación y targetas de productos',
        'Fue de los primeros proyectos realizados en grupo que hice',
      ],
      technologies: ['CSS', 'HTML']
    },
    {
      title: 'Videojuego de Pac-Man',
      company: 'Proyecto grupal de 7°mo año',
      date: '2026 - presente',
      description: [
        'Desarrollo de replica condiferente estilo de los juegos Pac-Man',
        'Implementación de mecánicas de juego, puntuaciones y sprites hechos a mano',
        'Trabajo en equipos de 2 personas'
      ],
      technologies: ['HTML', 'CSS', 'JavaScript']
    },
    {
      title: 'Portfolio Personal',
      company: 'Proyecto personal de 7°mo año',
      date: '2026 - presente',
      description: [
        'Creación de un portfolio personal para mostrar mis proyectos y habilidades',
        'Implementación de diseño responsivo y animaciones con IntersectionObserver',
        'Integración de componentes de React para mejorar la experiencia del usuario'
      ],
      technologies: ['HTML', 'CSS', 'React']
    }
  ];

  let timelineHTML = `
    <div class="experience-content">
      <h2>Experiencia</h2>
      <div class="timeline">
  `;

  //Va pasando por cada experiencia una por una para crearla en la página
  experiences.forEach((exp, index) => {
    const side = index % 2 === 0 ? 'left' : 'right';
    const techs = exp.technologies?.map(tech => 
      `<span class="tech-tag">${tech}</span>`
    ).join('') || '';

    timelineHTML += `
      <div class="timeline-item ${side}" data-index="${index}">
        <div class="timeline-content">
          <div class="timeline-header">
            <h3>${exp.title}</h3>
            <span class="company">${exp.company}</span>
          </div>
          <span class="date">${exp.date}</span>
          <ul class="description-list">
            ${exp.description.map(desc => `<li>${desc}</li>`).join('')}
          </ul>
          ${techs ? `<div class="experience-tech">${techs}</div>` : ''}
        </div>
      </div>
    `;
  });

  timelineHTML += `
      </div>
    </div>
  `;

  section.innerHTML = timelineHTML;

  // Observer para animación al hacer scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        section.classList.add('visible');
        
        // Animar cada item del timeline con delay
        const items = section.querySelectorAll('.timeline-item');
        items.forEach((item, index) => {
          setTimeout(() => {
            item.classList.add('visible');
          }, index * 200);
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