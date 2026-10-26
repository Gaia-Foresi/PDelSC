import { Content, rich, esc } from '../lib/content';

export function About(content: Content): HTMLElement {
  const p = content.perfil;
  const section = document.createElement('section');
  section.id = 'about';
  section.className = 'section';

  const paragraphs = [p.about_p1, p.about_p2, p.about_p3].filter(t => t && t.trim());
  const stats = [
    [p.stat_years, p.stat_years_label],
    [p.stat_projects, p.stat_projects_label],
    [p.stat_techs, p.stat_techs_label],
  ].filter(([n]) => n && n.trim());

  section.innerHTML = `
    <div class="container section-grid">
      <h2 class="section-title">Sobre mí</h2>
      <div class="section-body about-body">
        <div class="about-text">
          ${paragraphs.map(t => `<p>${rich(t)}</p>`).join('')}
        </div>
        ${
          stats.length
            ? `<dl class="about-stats">
                ${stats.map(([n, label]) => `<div class="stat"><dt>${esc(label)}</dt><dd>${esc(n)}</dd></div>`).join('')}
              </dl>`
            : ''
        }
      </div>
    </div>
  `;
  return section;
}
