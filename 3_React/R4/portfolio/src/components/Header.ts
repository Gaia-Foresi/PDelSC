import { ThemeToggle } from './ThemeToggle';
import { Content, esc } from '../lib/content';

const LINKS = [
  ['#about', 'Sobre mí'],
  ['#skills', 'Habilidades'],
  ['#experience', 'Experiencia'],
  ['#projects', 'Proyectos'],
  ['#contact', 'Contacto'],
];

export function Header(content: Content): HTMLElement {
  const header = document.createElement('header');
  header.className = 'site-header';

  header.innerHTML = `
    <div class="container header-inner">
      <a href="#top" class="brand">${esc(content.perfil.nombre)}</a>
      <button class="menu-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Abrir menú">
        <span></span><span></span>
      </button>
      <nav id="site-nav" class="site-nav">
        ${LINKS.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}
      </nav>
    </div>
  `;

  const nav = header.querySelector('.site-nav') as HTMLElement;
  nav.appendChild(ThemeToggle());

  // Menú en celular
  const toggle = header.querySelector('.menu-toggle') as HTMLButtonElement;
  const setOpen = (open: boolean) => {
    header.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };
  toggle.addEventListener('click', () => setOpen(!header.classList.contains('open')));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));

  // Sombra al hacer scroll
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  return header;
}
