import './styles/style.css';
import './admin/Admin.css';
import './theme';

import { loadContent } from './lib/content';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Skills } from './components/Skills';
import { Experience } from './components/Experience';
import { Projects } from './components/Projects';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { renderAdmin } from './admin/Admin';

// El panel se abre en /#admin o en /admin
const isAdminRoute = () => location.hash === '#admin' || location.pathname.replace(/\/$/, '') === '/admin';

async function start() {
  const app = document.getElementById('app')!;

  if (isAdminRoute()) {
    document.body.classList.add('is-admin');
    renderAdmin(app);
    return;
  }

  const content = await loadContent();
  document.title = `${content.perfil.nombre} | Portfolio`;

  const main = document.createElement('main');
  main.append(
    Hero(content),
    About(content),
    Skills(content),
    Experience(content),
    Projects(content),
    Contact(content)
  );
  app.replaceChildren(Header(content), main, Footer(content));
  document.body.classList.add('ready');

  // Si se entró con un #seccion en la URL, ir ahí ahora que existe
  if (location.hash && location.hash.length > 1) {
    try {
      document.querySelector(location.hash)?.scrollIntoView();
    } catch {}
  }
}

// Solo recargar al entrar o salir del panel (no al tocar los links del menú)
let wasAdmin = isAdminRoute();
window.addEventListener('hashchange', () => {
  if (isAdminRoute() !== wasAdmin) {
    wasAdmin = isAdminRoute();
    location.reload();
  }
});

start();
