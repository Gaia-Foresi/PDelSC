//Crea un elemento <footer> y le asigna la clase footer para aplicar sus estilos
export function Footer(): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'footer';

  const currentYear = new Date().getFullYear();

  footer.innerHTML = `
    <div class="footer-content">
      <div class="footer-top">
        <div class="footer-brand">
          <h3>🚀 Mi Portfolio</h3>
          <p>Estudiante de secundaria técnica apasionado por el desarrollo web.</p>
        </div>
        <div class="footer-links">
          <h4>Navegación</h4>
          <a href="#about">Sobre mí</a>
          <a href="#skills">Habilidades</a>
          <a href="#experience">Experiencia</a>
          <a href="#projects">Proyectos</a>
          <a href="#contact">Contacto</a>
        </div>
        <div class="footer-social">
          <h4>Redes</h4>
          <a href="#" target="_blank" rel="noopener noreferrer">🐙 GitHub</a>
          <a href="#" target="_blank" rel="noopener noreferrer">💼 LinkedIn</a>
          <a href="#" target="_blank" rel="noopener noreferrer">🐦 Twitter</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© ${currentYear} - Mi Portfolio. Todos los derechos reservados.</p>
        <p class="footer-tech">Hecho con TypeScript, Vite y 💙</p>
        <button id="backToTop" class="back-to-top" aria-label="Volver arriba">
          ↑ Volver arriba
        </button>
      </div>
    </div>
  `;

  //Crea un botón que permite regresar rápidamente al inicio de la página
  const backToTopBtn = footer.querySelector('#backToTop');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  //Detecta cada vez que el usuario se desplaza por la página
  window.addEventListener('scroll', () => {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    
    if (window.scrollY > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });

  return footer;
}