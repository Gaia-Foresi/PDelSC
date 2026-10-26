import { Content, esc } from '../lib/content';

export function Hero(content: Content): HTMLElement {
  const p = content.perfil;
  const section = document.createElement('section');
  section.className = 'hero';
  section.id = 'top';

  const [first, ...rest] = (p.nombre || '').split(' ');

  section.innerHTML = `
    <div class="container hero-inner">
      <div class="hero-text">
        <p class="hero-rol">${esc(p.rol)}</p>
        <h1 class="hero-name">
          <span>${esc(first)}</span>
          <span>${esc(rest.join(' '))}</span>
        </h1>
        <p class="hero-intro">${esc(p.intro)}</p>
        <div class="hero-actions">
          <a href="#projects" class="btn btn-primary">Ver proyectos</a>
          <a href="#contact" class="btn btn-ghost">Escribime</a>
        </div>
      </div>

      <figure class="hero-photo">
        <div class="photo-frame">
          <img src="/foto-perfil.jpg" alt="Foto de ${esc(p.nombre)}" width="320" height="380" />
          <span class="photo-fallback" aria-hidden="true">${esc((first || '?')[0])}</span>
        </div>
        <figcaption class="hand-note" aria-hidden="true">
          ¡hola, soy yo!
          <svg viewBox="0 0 80 60" class="hand-arrow"><path d="M6 8 C 30 6, 58 18, 66 48 M54 40 L66 50 L72 36"/></svg>
        </figcaption>
      </figure>
    </div>
  `;

  const img = section.querySelector('img') as HTMLImageElement;
  img.addEventListener('error', () => section.querySelector('.photo-frame')!.classList.add('no-photo'));

  return section;
}
