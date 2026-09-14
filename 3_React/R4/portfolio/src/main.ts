import './styles/style.css';
import { themeManager } from './theme';

// ========== IMPORTAR COMPONENTES ==========
import { Header } from './components/Header';
import { About } from './components/About';
import { Skills } from './components/Skills';
import { Experience } from './components/Experience';
import { Projects } from './components/Projects';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';

// ========== INICIALIZAR LA APP ==========
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) {
    console.error('❌ No se encontró el elemento #app');
    return;
  }

  // Renderizar todas las secciones
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