import { themeManager } from '../theme';

export function ThemeToggle(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'theme-toggle';
  button.setAttribute('aria-label', 'Cambiar tema');
  
  // Icono inicial según el tema actual
  const currentTheme = themeManager.getTheme();
  button.textContent = currentTheme === 'light' ? '🌙' : '☀️';
  
  // Evento para cambiar tema
  button.addEventListener('click', () => {
    themeManager.toggleTheme();
    const newTheme = themeManager.getTheme();
    button.textContent = newTheme === 'light' ? '🌙' : '☀️';
  });

  return button;
}