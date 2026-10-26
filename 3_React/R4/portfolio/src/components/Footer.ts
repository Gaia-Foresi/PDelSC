import { Content, esc, safeUrl } from '../lib/content';

export function Footer(content: Content): HTMLElement {
  const p = content.perfil;
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  const github = safeUrl(p.github);
  const linkedin = safeUrl(p.linkedin);

  footer.innerHTML = `
    <div class="container footer-inner">
      <p>© ${new Date().getFullYear()} ${esc(p.nombre)}. Hecho a mano con TypeScript y CSS.</p>
      <div class="footer-links">
        ${github ? `<a href="${esc(github)}" target="_blank" rel="noopener">GitHub</a>` : ''}
        ${linkedin ? `<a href="${esc(linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : ''}
        <a href="#top">Volver arriba</a>
      </div>
    </div>
  `;
  return footer;
}
