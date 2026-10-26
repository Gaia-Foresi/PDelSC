import { Content, esc, safeUrl } from '../lib/content';
import { toast } from '../lib/toast';

export function Contact(content: Content): HTMLElement {
  const p = content.perfil;
  const section = document.createElement('section');
  section.id = 'contact';
  section.className = 'section';
  const github = safeUrl(p.github);
  const linkedin = safeUrl(p.linkedin);

  section.innerHTML = `
    <div class="container section-grid">
      <h2 class="section-title">Contacto</h2>
      <div class="section-body contact-body">
        <div class="contact-info">
          <p class="contact-lead">¿Tenés un proyecto en mente, querés colaborar o simplemente saludar? Escribime.</p>
          <ul class="contact-list">
            ${p.email ? `<li><span>Email</span><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></li>` : ''}
            ${p.ubicacion ? `<li><span>Ubicación</span>${esc(p.ubicacion)}</li>` : ''}
            ${github ? `<li><span>GitHub</span><a href="${esc(github)}" target="_blank" rel="noopener">${esc(github.replace(/^https?:\/\/(www\.)?/, ''))}</a></li>` : ''}
            ${linkedin ? `<li><span>LinkedIn</span><a href="${esc(linkedin)}" target="_blank" rel="noopener">Ver perfil</a></li>` : ''}
          </ul>
        </div>

        <form class="contact-form" novalidate>
          <div class="field">
            <label for="c-nombre">Nombre</label>
            <input id="c-nombre" name="nombre" autocomplete="name" required minlength="2" maxlength="100" />
            <span class="field-error" aria-live="polite"></span>
          </div>
          <div class="field">
            <label for="c-email">Email</label>
            <input id="c-email" name="email" type="email" autocomplete="email" required maxlength="100" />
            <span class="field-error" aria-live="polite"></span>
          </div>
          <div class="field">
            <label for="c-asunto">Asunto</label>
            <input id="c-asunto" name="asunto" required minlength="3" maxlength="200" />
            <span class="field-error" aria-live="polite"></span>
          </div>
          <div class="field">
            <label for="c-mensaje">Mensaje</label>
            <textarea id="c-mensaje" name="mensaje" rows="5" required minlength="10" maxlength="2000"></textarea>
            <span class="field-error" aria-live="polite"></span>
            <span class="char-count">0 / 2000</span>
          </div>
          <!-- Campo trampa para bots: no lo completes -->
          <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <button type="submit" class="btn btn-primary">Enviar mensaje</button>
        </form>
      </div>
    </div>
  `;

  const form = section.querySelector('form') as HTMLFormElement;
  const fields = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.field input, .field textarea')];
  const counter = form.querySelector('.char-count') as HTMLElement;
  const textarea = form.querySelector('textarea') as HTMLTextAreaElement;
  const button = form.querySelector('button') as HTMLButtonElement;

  const validate = (el: HTMLInputElement | HTMLTextAreaElement): boolean => {
    const v = el.value.trim();
    const min = Number(el.getAttribute('minlength') || 0);
    let msg = '';
    if (!v) msg = 'Completá este campo.';
    else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = 'Escribí un email válido, por ejemplo nombre@mail.com.';
    else if (v.length < min) msg = `Escribí al menos ${min} caracteres.`;
    const err = el.parentElement!.querySelector('.field-error')!;
    err.textContent = msg;
    el.classList.toggle('invalid', !!msg);
    el.setAttribute('aria-invalid', String(!!msg));
    return !msg;
  };

  fields.forEach(el => {
    el.addEventListener('blur', () => el.value && validate(el));
    el.addEventListener('input', () => el.classList.contains('invalid') && validate(el));
  });
  textarea.addEventListener('input', () => {
    counter.textContent = `${textarea.value.length} / 2000`;
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const allOk = fields.map(validate).every(Boolean);
    if (!allOk) {
      fields.find(f => f.classList.contains('invalid'))?.focus();
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    button.disabled = true;
    button.textContent = 'Enviando...';

    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      toast('Mensaje enviado. Te respondo pronto por email.');
      form.reset();
      counter.textContent = '0 / 2000';
    } catch (err: any) {
      toast(err?.message || 'No se pudo enviar el mensaje. Probá de nuevo en un rato.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Enviar mensaje';
    }
  });

  return section;
}
