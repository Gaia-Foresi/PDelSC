import { Content, CATEGORIAS, esc } from '../lib/content';

export function Skills(content: Content): HTMLElement {
  const section = document.createElement('section');
  section.id = 'skills';
  section.className = 'section';

  // Agrupar por categoría respetando el orden en que aparecen
  const groups = new Map<string, typeof content.habilidades>();
  content.habilidades.forEach(s => {
    if (!groups.has(s.categoria)) groups.set(s.categoria, []);
    groups.get(s.categoria)!.push(s);
  });

  const levelBar = (n: number) =>
    `<span class="level" role="img" aria-label="Nivel ${n} de 5">${[1, 2, 3, 4, 5]
      .map(i => `<i class="${i <= n ? 'on' : ''}"></i>`)
      .join('')}</span>`;

  section.innerHTML = `
    <div class="container section-grid">
      <h2 class="section-title">Habilidades</h2>
      <div class="section-body">
        <div class="skills-grid">
          ${[...groups.entries()]
            .map(
              ([cat, list]) => `
            <div class="skill-group">
              <h3>${esc(CATEGORIAS[cat] || cat)}</h3>
              <ul>
                ${list
                  .map(s => `<li><span>${esc(s.nombre)}</span>${levelBar(s.nivel)}</li>`)
                  .join('')}
              </ul>
            </div>`
            )
            .join('')}
        </div>
        <p class="skills-legend"><span><span class="level"><i class="on"></i><i></i><i></i><i></i><i></i></span> recién empiezo</span><span><span class="level"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i></span> lo manejo muy bien</span></p>
      </div>
    </div>
  `;
  return section;
}
