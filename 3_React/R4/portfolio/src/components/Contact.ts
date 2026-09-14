interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

import Parse from '../parseConfig';

//Crea el <section> donde va a estar todo el contenido de contacto
export function Contact(): HTMLElement {
  const section = document.createElement('section');
  section.id = 'contact';
  section.className = 'section';

  section.innerHTML = `
    <div class="contact-content">
      <h2>Contacto</h2>
      <div class="contact-wrapper">
        <div class="contact-info">
          <h3>¿Hablamos?</h3>
          <p>
            ¿Tenés un proyecto en mente, querés colaborar o simplemente 
            querés saludar? ¡No dudes en contactarme!
          </p>
          <div class="contact-methods">
            <div class="contact-method">
              <span class="icon">📧</span>
              <span>gaiaforesi17@email.com</span>
            </div>
            <div class="contact-method">
              <span class="icon">📍</span>
              <span>Mar Del Plata, Argentina</span>
            </div>
          </div>
          <div class="social-links">
            <a href="https://github.com/Gaia-Foresi" target="_blank" class="social-link">
              <span class="social-icon">🐙</span> GitHub
            </a>
          </div>
        </div>
        
        <form id="contactForm" class="contact-form" novalidate>
          <div class="form-group">
            <label for="name">Nombre completo *</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required 
              placeholder="Tu nombre completo"
              minlength="2"
              maxlength="50"
            />
            <span class="error-message" id="nameError"></span>
          </div>
          
          <div class="form-group">
            <label for="email">Email *</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required 
              placeholder="tu@email.com"
            />
            <span class="error-message" id="emailError"></span>
          </div>
          
          <div class="form-group">
            <label for="subject">Asunto *</label>
            <input 
              type="text" 
              id="subject" 
              name="subject" 
              required 
              placeholder="¿Sobre qué querés hablar?"
              minlength="3"
              maxlength="100"
            />
            <span class="error-message" id="subjectError"></span>
          </div>
          
          <div class="form-group">
            <label for="message">Mensaje *</label>
            <textarea 
              id="message" 
              name="message" 
              required 
              placeholder="Escribí tu mensaje aquí..."
              rows="5"
              minlength="10"
              maxlength="500"
            ></textarea>
            <span class="error-message" id="messageError"></span>
            <span class="char-counter" id="charCounter">0/500</span>
          </div>
          
          <button type="submit" class="btn-submit">
            <span class="btn-text">Enviar mensaje</span>
            <span class="btn-spinner" style="display: none;">⏳</span>
          </button>
        </form>
      </div>
    </div>
  `;

  //Validaciones y eventos 
  setupFormValidation(section);
  setupCharCounter(section);
  setupFormSubmit(section);

  //Animación al hacer scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        section.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { 
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  observer.observe(section);

  return section;
}

//Funciones de validación, contador de caracteres y envío del formulario
//
//
//Configura la validación de los campos del formulario y controla la aparición y eliminación de mensajes de error
function setupFormValidation(section: HTMLElement): void {
  const form = section.querySelector('#contactForm') as HTMLFormElement;
  if (!form) return;

  const inputs = form.querySelectorAll('input, textarea');
  
  inputs.forEach(input => {
    input.addEventListener('blur', () => {
      validateField(input as HTMLInputElement | HTMLTextAreaElement);
    });

    input.addEventListener('input', () => {
      // Limpiar error mientras el usuario escribe
      const errorElement = document.getElementById(`${input.id}Error`);
      if (errorElement) {
        errorElement.textContent = '';
        input.classList.remove('error');
      }
    });
  });
}

//Valida individualmente cada campo del formulario
function validateField(input: HTMLInputElement | HTMLTextAreaElement): boolean {
  const errorElement = document.getElementById(`${input.id}Error`);
  if (!errorElement) return true;

  let errorMessage = '';

  // Validación según tipo de campo
  if (input.hasAttribute('required') && !input.value.trim()) {
    errorMessage = 'Este campo es obligatorio';
  } else if (input.type === 'email' && input.value.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.value.trim())) {
      errorMessage = 'Ingresá un email válido';
    }
  } else if (input.type === 'text' && input.hasAttribute('minlength')) {
    const minLength = parseInt(input.getAttribute('minlength') || '0');
    if (input.value.trim().length < minLength) {
      errorMessage = `Mínimo ${minLength} caracteres`;
    }
  } else if (input.id === 'message') {
    const minLength = parseInt(input.getAttribute('minlength') || '0');
    if (input.value.trim().length < minLength) {
      errorMessage = `Mínimo ${minLength} caracteres`;
    }
  }

  if (errorMessage) {
    errorElement.textContent = errorMessage;
    input.classList.add('error');
    return false;
  } else {
    errorElement.textContent = '';
    input.classList.remove('error');
    return true;
  }
}

//Cuenta cuántos caracteres tiene el mensaje y actualiza el contador
function setupCharCounter(section: HTMLElement): void {
  const messageArea = section.querySelector('#message') as HTMLTextAreaElement;
  const counter = section.querySelector('#charCounter');
  if (!messageArea || !counter) return;

  messageArea.addEventListener('input', () => {
    const length = messageArea.value.length;
    const maxLength = parseInt(messageArea.getAttribute('maxlength') || '500');
    counter.textContent = `${length}/${maxLength}`;
    
    if (length > maxLength * 0.9) {
      counter.classList.add('warning');
    } else {
      counter.classList.remove('warning');
    }
  });
}

//Se encarga del botón Enviar: revisa todo, si hay errores avisa, si está todo bien junta los datos y los guarda en Back4App
function setupFormSubmit(section: HTMLElement): void {
  const form = section.querySelector('#contactForm') as HTMLFormElement;
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validar todos los campos
    const inputs = form.querySelectorAll('input, textarea');
    let isValid = true;

    inputs.forEach(input => {
      const isFieldValid = validateField(input as HTMLInputElement | HTMLTextAreaElement);
      if (!isFieldValid) isValid = false;
    });

    if (!isValid) {
      // Mostrar mensaje de error general
      showNotification('Por favor, corregí los campos marcados en rojo.', 'error');
      return;
    }

    // Recopilar datos del formulario
    const formData = new FormData(form);
    const data: ContactFormData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      subject: formData.get('subject') as string,
      message: formData.get('message') as string
    };

    // Guardar en la base de datos de Back4App
    await simulateSubmit(form, data);
  });
}

//Envía el mensaje a la base de datos de Back4App y muestra al usuario que se está enviando
async function simulateSubmit(form: HTMLFormElement, data: ContactFormData): Promise<void> {
  const submitBtn = form.querySelector('.btn-submit') as HTMLButtonElement;
  const btnText = submitBtn.querySelector('.btn-text') as HTMLSpanElement;
  const btnSpinner = submitBtn.querySelector('.btn-spinner') as HTMLSpanElement;

  // Deshabilitar botón y mostrar spinner
  submitBtn.disabled = true;
  btnText.textContent = 'Enviando...';
  btnSpinner.style.display = 'inline';

  try {
    // Crear un objeto Parse de la clase ContactMessage y guardarlo en Back4App
    const ContactMessage = Parse.Object.extend('ContactMessage');
    const msg = new ContactMessage();
    
    msg.set('name', data.name);
    msg.set('email', data.email);
    msg.set('subject', data.subject);
    msg.set('message', data.message);

    await msg.save();

    // Mostrar éxito
    showNotification('✅ ¡Mensaje guardado en la base de datos!', 'success');
    
    // Resetear formulario
    form.reset();
    
    // Resetear contador de caracteres
    const counter = form.querySelector('#charCounter');
    if (counter) counter.textContent = '0/500';

  } catch (error) {
    // Mostrar error en consola y al usuario
    console.error('Error al guardar en Back4App:', error);
    showNotification('❌ Hubo un error al enviar el mensaje. Intentá de nuevo.', 'error');
  } finally {
    // Restaurar botón
    submitBtn.disabled = false;
    btnText.textContent = 'Enviar mensaje';
    btnSpinner.style.display = 'none';
  }
}

//función encargada de mostrar los cartelitos de aviso al usuario
function showNotification(message: string, type: 'success' | 'error'): void {
  // Crear notificación
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Estilos de la notificación
  Object.assign(notification.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '16px 24px',
    borderRadius: '12px',
    maxWidth: '400px',
    zIndex: '9999',
    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
    opacity: '0',
    transform: 'translateY(100px)',
    transition: 'all 0.5s ease',
    backgroundColor: type === 'success' ? '#28a745' : '#dc3545',
    color: 'white',
    fontWeight: '500',
    fontSize: '0.95rem',
    whiteSpace: 'pre-line'
  });

  document.body.appendChild(notification);

  // Mostrar con animación
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);

  // Auto-ocultar después de 5 segundos
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(100px)';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 5000);
}