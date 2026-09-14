interface Skill {
  name: string;
  level: number; // 1-5
  category: 'frontend' | 'backend' | 'tools' | 'soft';
}

// Función para crear la sección de habilidades
export function Skills(): HTMLElement {

  // Crear el contenedor de la sección
  const section = document.createElement('section');
  section.id = 'skills';
  section.className = 'section';

  // Datos de habilidades
  const skills: Skill[] = [
    // Frontend
    { name: 'JavaScript', level: 3, category: 'frontend' },
    { name: 'TypeScript', level: 3, category: 'frontend' },
    { name: 'HTML5/CSS3', level: 4, category: 'frontend' },
    { name: 'React', level: 3, category: 'frontend' },
    
    // Backend y Base de Datos
    { name: 'Node.js', level: 3, category: 'backend' },
    { name: 'MySQL', level: 4, category: 'backend' },

    // Herramientas
    { name: 'Git/GitHub', level: 3, category: 'tools' },
    { name: 'VS Code', level: 4, category: 'tools' },
    
    // Habilidades blandas
    { name: 'Trabajo en equipo', level: 5, category: 'soft' },
    { name: 'Comunicación', level: 4, category: 'soft' },
    { name: 'Resolución de problemas', level: 4, category: 'soft' },
    { name: 'Aprendizaje autónomo', level: 3, category: 'soft' },
  ];

  //Define los nombres que se mostrarán visualmente para cada categoría
  const categoryNames = {
    frontend: '🖥️ Frontend',
    backend: '⚙️ Backend',
    tools: '🔧 Herramientas',
    soft: '💡 Habilidades Blandas'
  };

  // Agrupar habilidades por categoría
  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  // Construir el HTML
  let skillsHTML = `
    <div class="skills-content">
      <h2>Habilidades Técnicas</h2>
      <div class="skills-grid">
  `;

  //Recorre cada categoría y obtiene la lista de habilidades que pertenece a ella
  for (const [category, skillList] of Object.entries(groupedSkills)) {
    skillsHTML += `
      <div class="skill-category">
        <h3>${categoryNames[category as keyof typeof categoryNames] || category}</h3>
        <div class="skill-items">
    `;

    // Ordenar por nivel (de mayor a menor)
    skillList.sort((a, b) => b.level - a.level);

    skillList.forEach(skill => {
      const stars = '⭐'.repeat(skill.level) + '☆'.repeat(5 - skill.level);
      skillsHTML += `
        <div class="skill-item">
          <span class="skill-name">${skill.name}</span>
          <span class="skill-level" title="Nivel ${skill.level}/5">${stars}</span>
        </div>
      `;
    });

    skillsHTML += `
        </div>
      </div>
    `;
  }

  skillsHTML += `
      </div>
    </div>
  `;

  section.innerHTML = skillsHTML;

  // Observer para animación al hacer scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        section.classList.add('visible');
        // Animar cada categoría con delay
        const categories = section.querySelectorAll('.skill-category');
        categories.forEach((cat, index) => {
          setTimeout(() => {
            cat.classList.add('visible');
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