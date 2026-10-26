import { themeManager } from '../theme';

const MOON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>`;
const SUN = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;

export function ThemeToggle(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'theme-toggle';

  const paint = () => {
    const dark = themeManager.getTheme() === 'dark';
    button.innerHTML = dark ? SUN : MOON;
    button.setAttribute('aria-label', dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
  };

  button.addEventListener('click', () => {
    themeManager.toggleTheme();
    paint();
  });
  paint();
  return button;
}
