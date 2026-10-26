import { Content, esc, lines, commas } from '../lib/content';

export function Experience(content: Content): HTMLElement {
  const section = document.createElement('section');
  section.id = 'experience';
  section.className = 'section';

  section.innerHTML = `
    <div class="container section-grid">
      <h2 class="section-title">Experiencia</h2>
      <div class="section-body">
        <ol class="timeline">
          ${content.experiencias
            .map(
              e => `
            <li class="timeline-item">
              <span class="timeline-date">${esc(e.fecha)}</span>
              <h3>${esc(e.titulo)}</h3>
              ${e.lugar ? `<p class="timeline-place">${esc(e.lugar)}</p>` : ''}
              <ul class="timeline-list">
                ${lines(e.descripcion).map(d => `<li>${esc(d)}</li>`).join('')}
              </ul>
              <div class="tags">${commas(e.tecnologias).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
            </li>`
            )
            .join('')}
        </ol>
      </div>
    </div>
  `;
  return section;
}
