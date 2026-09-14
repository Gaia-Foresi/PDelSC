import { ThemeToggle } from './ThemeToggle';

//Crea un elemento <header> y le asigna la clase header para aplicar los estilos correspondientes
export function Header(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'header';
  
  // Estructura del header
  header.innerHTML = `
    <h1>🚀 Mi Portfolio</h1>
    <nav>
      <a href="#about">Sobre mí</a>
      <a href="#skills">Habilidades</a>
      <a href="#experience">Experiencia</a>
      <a href="#projects">Proyectos</a>
      <a href="#contact">Contacto</a>
    </nav>
  `;
  
  // Agregar el boton de tema
  const nav = header.querySelector('nav');
  if (nav) {
    const toggle = ThemeToggle();
    nav.appendChild(toggle);
  }

  // Efecto de scroll para el header
  let isScrolled = false;
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 50;
    if (scrolled !== isScrolled) {
      isScrolled = scrolled;
      if (scrolled) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  });

  return header;
}