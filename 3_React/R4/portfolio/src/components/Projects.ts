import { Content, esc, lines, commas, safeUrl } from '../lib/content';

export function Projects(content: Content): HTMLElement {
  const section = document.createElement('section');
  section.id = 'projects';
  section.className = 'section';

  section.innerHTML = `
    <div class="container section-grid">
      <h2 class="section-title">Proyectos</h2>
      <div class="section-body">
        <div class="projects-grid">
          ${content.proyectos
            .map(p => {
              const link = safeUrl(p.link);
              const github = safeUrl(p.github);
              const features = lines(p.caracteristicas);
              return `
            <article class="project-card">
              <header class="project-head">
                <h3>${esc(p.nombre)}</h3>
                <span class="project-date">${esc(p.fecha)}</span>
              </header>
              <p class="project-desc">${esc(p.descripcion)}</p>
              ${
                features.length
                  ? `<details class="project-details">
                      <summary>Qué tiene</summary>
                      <ul>${features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
                    </details>`
                  : ''
              }
              <footer class="project-foot">
                <div class="tags">${commas(p.tecnologias).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
                ${
                  link || github
                    ? `<div class="project-links">
                        ${github ? `<a href="${esc(github)}" target="_blank" rel="noopener">Código</a>` : ''}
                        ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">Ver demo</a>` : ''}
                      </div>`
                    : ''
                }
              </footer>
            </article>`;
            })
            .join('')}
        </div>
      </div>
    </div>
  `;
  return section;
}
