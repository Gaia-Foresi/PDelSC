import './styles/style.css';
import './admin/Admin.css';
import { themeManager } from './theme';

import { Header } from './components/Header';
import { About } from './components/About';
import { Skills } from './components/Skills';
import { Experience } from './components/Experience';
import { Projects } from './components/Projects';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { renderAdmin } from './admin/Admin';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) {
    console.error('❌ No se encontró el elemento #app');
    return;
  }

  // ⬇️ ESTA LÍNEA TIENE QUE ESTAR
  if (window.location.hash === '#admin') {
    renderAdmin(app);
    return;
  }

  // Si no, renderizar el portfolio normal
  app.appendChild(Header());
  app.appendChild(About());
  app.appendChild(Skills());
  app.appendChild(Experience());
  app.appendChild(Projects());
  app.appendChild(Contact());
  app.appendChild(Footer());

  console.log('✅ Portfolio inicializado correctamente');
  console.log('📌 Tema actual:', themeManager.getTheme());
});

// Detectar cambios en el hash de la URL
window.addEventListener('hashchange', () => {
  window.location.reload();
});