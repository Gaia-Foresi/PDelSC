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
      title: 'Desarrollador Full-Stack Freelance',
      company: 'Proyectos Independientes',
      date: '2024 - Presente',
      description: [
        'Desarrollo de aplicaciones web completas para clientes locales',
        'Implementación de soluciones con React, Node.js y PostgreSQL',
        'Diseño de interfaces responsive con enfoque mobile-first',
        'Mantenimiento y mejora de sistemas existentes'
      ],
      technologies: ['React', 'Node.js', 'PostgreSQL', 'TypeScript']
    },
    {
      title: 'Prácticas Profesionales',
      company: 'TechSolutions S.A.',
      date: '2023',
      description: [
        'Mantenimiento de sistemas internos de la empresa',
        'Corrección de bugs y optimización de consultas SQL',
        'Participación en desarrollo de nuevos módulos',
        'Documentación técnica de proyectos'
      ],
      technologies: ['Python', 'SQL', 'Docker', 'Git']
    },
    {
      title: 'Proyecto Integrador Escolar',
      company: 'Escuela Técnica N°1',
      date: '2022 - 2023',
      description: [
        'Desarrollo de sistema de gestión escolar con Python y SQL',
        'Módulos de administración de alumnos y profesores',
        'Sistema de calificaciones y reportes',
        'Trabajo en equipo con metodología ágil'
      ],
      technologies: ['Python', 'SQL', 'Bootstrap', 'Git']
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