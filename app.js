// ═══════════════════════════════════════════════════════════════
// UTILIDADES - MARKDOWN LIGERO
// ═══════════════════════════════════════════════════════════════

/**
 * Procesa texto con sintaxis Markdown ligera
 * Soporta: **negrita**, *cursiva*, ***negrita cursiva***
 * Preserva saltos de línea
 */
function parseMarkdown(text) {
  if (!text) return '';
  
  let processed = text;
  
  // Escapar HTML para prevenir XSS
  processed = processed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Procesar ***negrita cursiva*** primero (3 asteriscos)
  processed = processed.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  
  // Procesar **negrita** (2 asteriscos)
  processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Procesar *cursiva* (1 asterisco)
  processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  return processed;
}

// ═══════════════════════════════════════════════════════════════
// DIARIO ONÍRICO - GESTOR DE SUEÑOS
// Versión: Con soporte datos.json y modo localhost/público
// ═══════════════════════════════════════════════════════════════

class DiarioOnirico {
  constructor() {
    this.entries = [];
    this.currentView = 'list';
    this.editingId = null;
    this.isLocalhost = this.detectMode();
    this.init();
  }

  // ─── DETECCIÓN DE MODO ───
  detectMode() {
    // Detecta si está corriendo en localhost (file://) o en servidor (https://)
    const isFile = window.location.protocol === 'file:';
    const isLocalServer = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
    return isFile || isLocalServer;
  }

  async init() {
    // Cargar datos al inicio
    await this.loadInitialData();
    
    // Configurar navegación
    this.setupNavigation();
    
    // Ocultar botones según el modo
    this.configureUIMode();
    
    // Renderizar vista inicial
    this.render();
  }

  // ─── CARGA INICIAL DE DATOS ───
  async loadInitialData() {
    try {
      // Intentar cargar datos.json
      const response = await fetch('./datos.json');
      
      if (response.ok) {
        const data = await response.json();
        this.entries = data;
        
        // Si estamos en localhost, también guardar en localStorage para edición
        if (this.isLocalhost) {
          localStorage.setItem('diario_onirico', JSON.stringify(data));
        }
        
        console.log(`✅ Datos cargados desde datos.json (${data.length} entradas)`);
      } else {
        throw new Error('No se pudo cargar datos.json');
      }
    } catch (error) {
      console.log('⚠️ No se encontró datos.json, usando localStorage o array vacío');
      
      // Fallback a localStorage (solo en localhost)
      if (this.isLocalhost) {
        const localData = localStorage.getItem('diario_onirico');
        this.entries = localData ? JSON.parse(localData) : [];
      } else {
        this.entries = [];
      }
    }
  }

  // ─── CONFIGURAR UI SEGÚN MODO ───
  configureUIMode() {
    const navCreate = document.getElementById('nav-create');
    const navManage = document.getElementById('nav-manage');
    
    if (!this.isLocalhost) {
      // Modo público: ocultar botones de edición
      if (navCreate) navCreate.classList.add('hidden');
      if (navManage) navManage.classList.add('hidden');
    }
  }

  // ─── ALMACENAMIENTO (Solo localhost) ───
  loadEntries() {
    if (!this.isLocalhost) return [];
    const data = localStorage.getItem('diario_onirico');
    return data ? JSON.parse(data) : [];
  }

  saveEntries() {
    if (!this.isLocalhost) {
      console.warn('⚠️ No se puede guardar en modo público');
      return;
    }
    localStorage.setItem('diario_onirico', JSON.stringify(this.entries));
  }

  // ─── NAVEGACIÓN ───
  setupNavigation() {
    document.querySelectorAll('[data-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Si no está en localhost y intenta crear/editar, mostrar aviso
        if (!this.isLocalhost && link.dataset.view === 'create') {
          alert('Esta función solo está disponible en modo localhost');
          return;
        }
        
        this.editingId = null;
        this.changeView(link.dataset.view);
      });
    });
  }

  changeView(view) {
    this.currentView = view;
    
    // Actualizar navegación activa
    document.querySelectorAll('[data-view]').forEach(link => {
      link.classList.toggle('active', link.dataset.view === view);
    });

    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── RENDERIZADO PRINCIPAL ───
  render() {
    const app = document.getElementById('app');
    
    switch(this.currentView) {
      case 'list':
        app.innerHTML = this.renderList();
        this.attachListHandlers();
        break;
      case 'create':
        if (!this.isLocalhost) {
          app.innerHTML = this.renderReadOnlyNotice();
        } else {
          app.innerHTML = this.renderForm();
          this.attachFormHandlers();
        }
        break;
      case 'detail':
        app.innerHTML = this.renderDetail(this.editingId);
        this.attachDetailHandlers();
        break;
      case 'search':
        app.innerHTML = this.renderSearch();
        this.attachSearchHandlers();
        break;
      case 'manage':
        if (!this.isLocalhost) {
          app.innerHTML = this.renderReadOnlyNotice();
        } else {
          app.innerHTML = this.renderManage();
          this.attachManageHandlers();
        }
        break;
    }
  }

  // ─── VISTA: AVISO SOLO LECTURA ───
  renderReadOnlyNotice() {
    return `
      <div class="readonly-notice">
        <p>
          <strong>Modo Solo Lectura</strong><br><br>
          Esta función solo está disponible cuando abres el diario desde localhost.<br>
          Para crear o editar entradas, descarga el proyecto y ábrelo localmente.
        </p>
      </div>
    `;
  }

  // ─── VISTA: LISTA DE ENTRADAS ───
  renderList() {
    const readOnlyBanner = !this.isLocalhost ? `
      <div class="readonly-notice" style="margin-bottom: 32px;">
        <p>
          <strong>Modo Solo Lectura</strong> — 
          Estás viendo el diario publicado. Para editar, usa la versión localhost.
        </p>
      </div>
    ` : '';

    if (this.entries.length === 0) {
      return `
        ${readOnlyBanner}
        <div class="section-header">
          <div class="section-number">Archivo Onírico</div>
          <h2 class="section-title">Entradas Registradas</h2>
          <p class="section-subtitle">No hay entradas todavía</p>
        </div>
        <div class="no-results">
          <p>El diario está vacío. ${this.isLocalhost ? 'Crea tu primera entrada para comenzar a registrar tus sueños.' : 'Aún no hay sueños registrados.'}</p>
        </div>
      `;
    }

    // Ordenar por fecha (más reciente primero)
    const sorted = [...this.entries].sort((a, b) => 
      new Date(b.fecha) - new Date(a.fecha)
    );

    return `
      ${readOnlyBanner}
      <div class="section-header">
        <div class="section-number">Archivo Onírico</div>
        <h2 class="section-title">Entradas Registradas</h2>
        <p class="section-subtitle">${this.entries.length} entrada(s) en total</p>
      </div>
      <div class="entry-list">
        ${sorted.map(entry => this.renderEntryCard(entry)).join('')}
      </div>
    `;
  }

  renderEntryCard(entry) {
    const dreamCount = entry.sueños.length;
    const preview = entry.sueños[0]?.descripcion.substring(0, 150) || '';

    return `
      <div class="entry-card" data-id="${entry.id}">
        <div class="entry-header">
          <div class="entry-id">${entry.id}</div>
          <h3 class="entry-title">${entry.titulo}</h3>
          <div class="entry-meta">
            <strong>${entry.autor}</strong> — ${entry.fecha}
          </div>
        </div>
        ${entry.imagen_general ? `
          <img src="${entry.imagen_general}" alt="${entry.titulo}" class="entry-image">
        ` : ''}
        <div class="entry-preview">
          ${preview}${preview.length >= 150 ? '...' : ''}
        </div>
        <div class="entry-footer">
          <span class="dream-count">${dreamCount} sueño${dreamCount > 1 ? 's' : ''}</span>
          <button class="btn btn-small btn-secondary" data-action="view" data-id="${entry.id}">
            Ver Completo
          </button>
        </div>
      </div>
    `;
  }

  attachListHandlers() {
    document.querySelectorAll('.entry-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          this.viewEntry(card.dataset.id);
        }
      });
    });

    document.querySelectorAll('[data-action="view"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.viewEntry(btn.dataset.id);
      });
    });
  }

  // ─── VISTA: DETALLE DE ENTRADA ───
  viewEntry(id) {
    this.editingId = id;
    this.currentView = 'detail';
    this.render();
  }

  renderDetail(id) {
    const entry = this.entries.find(e => e.id === id);
    if (!entry) {
      return '<div class="no-results"><p>Entrada no encontrada</p></div>';
    }

    const editButtons = this.isLocalhost ? `
      <button class="btn btn-primary" data-action="edit" data-id="${entry.id}">Editar</button>
      <button class="btn btn-secondary" data-action="delete" data-id="${entry.id}">Eliminar</button>
    ` : '';

    return `
      <div class="dream-detail">
        <div class="detail-header">
          <div class="detail-id">${entry.id}</div>
          <h2 class="detail-title">${entry.titulo}</h2>
          <div class="detail-meta">
            <strong>${entry.autor}</strong> — ${entry.fecha}
          </div>
        </div>

        ${entry.imagen_general ? `
          <img src="${entry.imagen_general}" alt="${entry.titulo}" class="detail-image">
        ` : ''}

        <div style="margin: 40px 0;">
          ${entry.sueños.map((sueno, idx) => this.renderDreamBlock(sueno, idx, entry.id)).join('')}
        </div>

        <div class="btn-group">
          <button class="btn btn-secondary" data-action="back">← Volver</button>
          ${editButtons}
        </div>
      </div>
    `;
  }

  renderDreamBlock(sueno, idx, entryId) {
    const claridades = {
      'bajo': 'Bajo',
      'medio-bajo': 'Medio-Bajo',
      'medio': 'Medio',
      'medio-alto': 'Medio-Alto',
      'alto': 'Alto'
    };

    return `
      <div class="dream-block">
        <div class="dream-number">🌙 Sueño ${sueno.id}</div>
        
        <div class="dream-description">${parseMarkdown(sueno.descripcion)}</div>

        <div class="dream-meta-row">
          <div class="dream-meta-item">
            <div class="meta-label">Claridad</div>
            <div class="meta-value">${claridades[sueno.claridad] || sueno.claridad}</div>
          </div>
          <div class="dream-meta-item">
            <div class="meta-label">Tipo</div>
            <div class="meta-value">${sueno.tipo}</div>
          </div>
        </div>

        ${sueno.señales && sueno.señales.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <div class="meta-label" style="margin-bottom: 12px;">Señales Oníricas</div>
            <ul class="signals-list">
              ${sueno.señales.map(s => `<li>${parseMarkdown(s)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${sueno.interpretacion ? `
          <div>
            <div class="meta-label" style="margin-bottom: 12px;">Interpretación Onírica</div>
            <div class="interpretation">${parseMarkdown(sueno.interpretacion)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  attachDetailHandlers() {
    const backBtn = document.querySelector('[data-action="back"]');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.changeView('list'));
    }

    if (this.isLocalhost) {
      const editBtn = document.querySelector('[data-action="edit"]');
      if (editBtn) {
        editBtn.addEventListener('click', () => this.editEntry(editBtn.dataset.id));
      }

      const deleteBtn = document.querySelector('[data-action="delete"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => this.deleteEntry(deleteBtn.dataset.id));
      }
    }
  }

  // ─── VISTA: FORMULARIO ───
  renderForm() {
    const isEditing = this.editingId !== null;
    const entry = isEditing ? this.entries.find(e => e.id === this.editingId) : null;

    return `
      <div class="section-header">
        <div class="section-number">${isEditing ? 'Editar' : 'Nueva'} Entrada</div>
        <h2 class="section-title">${isEditing ? 'Modificar Registro' : 'Crear Nueva Entrada'}</h2>
        <p class="section-subtitle">Completa los detalles de tu experiencia onírica</p>
      </div>

      <form id="entry-form">
        <div class="form-group">
          <label class="form-label">Título de la Noche</label>
          <input type="text" class="form-input" name="titulo" 
                 value="${entry?.titulo || ''}" 
                 placeholder="Ej: Noche del laberinto infinito" required>
        </div>

        <div class="form-group">
          <label class="form-label">Autor</label>
          <input type="text" class="form-input" name="autor" 
                 value="${entry?.autor || ''}" 
                 placeholder="Tu nombre" required>
        </div>

        <div class="form-group">
          <label class="form-label">Fecha y Hora</label>
          <input type="datetime-local" class="form-input" name="fecha" 
                 value="${entry?.fecha || this.getCurrentDateTime()}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Imagen General (URL)</label>
          <input type="url" class="form-input" name="imagen_general" 
                 value="${entry?.imagen_general || ''}" 
                 placeholder="https://ejemplo.com/imagen.jpg o images/E33.jpg" required>
          <p style="font-size: 0.85rem; color: var(--parchment-dim); margin-top: 8px; font-style: italic;">
            Puedes usar una URL externa o una ruta relativa como "images/E33.jpg"
          </p>
        </div>

        <div style="margin: 48px 0 24px;">
          <div class="section-number">Sueños de la Noche</div>
        </div>

        <div id="dreams-container" class="dreams-container">
          ${isEditing && entry ? 
            entry.sueños.map((s, i) => this.renderDreamFormBlock(i, s)).join('') :
            this.renderDreamFormBlock(0)
          }
        </div>

        <button type="button" class="btn btn-secondary" id="add-dream">
          + Añadir Otro Sueño
        </button>

        <div class="btn-group">
          <button type="button" class="btn btn-secondary" id="cancel-btn">Cancelar</button>
          <button type="submit" class="btn btn-primary">
            ${isEditing ? 'Guardar Cambios' : 'Crear Entrada'}
          </button>
        </div>
      </form>
    `;
  }

  renderDreamFormBlock(index, dream = null) {
    const letter = String.fromCharCode(65 + index); // A, B, C...
    
    return `
      <div class="dream-form-block" data-dream-index="${index}">
        <div class="dream-form-header">
          <div class="dream-form-title">Sueño ${letter}</div>
          ${index > 0 ? '<button type="button" class="btn-remove" data-remove-dream>Eliminar</button>' : ''}
        </div>

        <div class="form-group">
          <label class="form-label">Descripción del Sueño</label>
          <textarea class="form-textarea" name="dream_${index}_descripcion" 
                    placeholder="Describe tu sueño con el mayor detalle posible..." required>${dream?.descripcion || ''}</textarea>
          <p style="font-size: 0.85rem; color: var(--parchment-dim); margin-top: 8px; font-style: italic;">
            💡 Tip: Usa **texto** para negrita, *texto* para cursiva, ***texto*** para ambos
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">Nivel de Claridad</label>
          <select class="form-select" name="dream_${index}_claridad" required>
            <option value="bajo" ${dream?.claridad === 'bajo' ? 'selected' : ''}>Bajo</option>
            <option value="medio-bajo" ${dream?.claridad === 'medio-bajo' ? 'selected' : ''}>Medio-Bajo</option>
            <option value="medio" ${dream?.claridad === 'medio' ? 'selected' : ''}>Medio</option>
            <option value="medio-alto" ${dream?.claridad === 'medio-alto' ? 'selected' : ''}>Medio-Alto</option>
            <option value="alto" ${dream?.claridad === 'alto' ? 'selected' : ''}>Alto</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Tipo de Sueño</label>
          <select class="form-select" name="dream_${index}_tipo" required>
            <option value="Normal" ${dream?.tipo === 'Normal' ? 'selected' : ''}>Normal</option>
            <option value="Lúcido" ${dream?.tipo === 'Lúcido' ? 'selected' : ''}>Lúcido</option>
            <option value="Pesadilla" ${dream?.tipo === 'Pesadilla' ? 'selected' : ''}>Pesadilla</option>
            <option value="Recurrente" ${dream?.tipo === 'Recurrente' ? 'selected' : ''}>Recurrente</option>
            <option value="Premonitorio" ${dream?.tipo === 'Premonitorio' ? 'selected' : ''}>Premonitorio</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Señales Oníricas</label>
          <div class="signals-input-group" data-signals-container="${index}">
            ${dream?.señales && dream.señales.length > 0 ? 
              dream.señales.map((s, si) => this.renderSignalInput(index, si, s)).join('') :
              this.renderSignalInput(index, 0)
            }
          </div>
          <button type="button" class="btn btn-small btn-secondary btn-add-signal" 
                  data-add-signal="${index}">+ Añadir Señal</button>
        </div>

        <div class="form-group">
          <label class="form-label">Interpretación Onírica</label>
          <textarea class="form-textarea" name="dream_${index}_interpretacion" 
                    placeholder="¿Qué sentiste? ¿Qué interpretas de este sueño?">${dream?.interpretacion || ''}</textarea>
          <p style="font-size: 0.85rem; color: var(--parchment-dim); margin-top: 8px; font-style: italic;">
            💡 Tip: Usa **texto** para negrita, *texto* para cursiva
          </p>
        </div>
      </div>
    `;
  }

  renderSignalInput(dreamIndex, signalIndex, value = '') {
    return `
      <div class="signal-item">
        <input type="text" class="form-input" 
               name="dream_${dreamIndex}_signal_${signalIndex}" 
               value="${value}"
               placeholder="Ej: Los colores eran muy brillantes">
        ${signalIndex > 0 ? `
          <button type="button" class="btn-remove btn-small" 
                  data-remove-signal="${dreamIndex}-${signalIndex}">×</button>
        ` : ''}
      </div>
    `;
  }

  attachFormHandlers() {
    const form = document.getElementById('entry-form');
    const addDreamBtn = document.getElementById('add-dream');
    const cancelBtn = document.getElementById('cancel-btn');

    // Añadir sueño
    addDreamBtn.addEventListener('click', () => {
      const container = document.getElementById('dreams-container');
      const currentCount = container.querySelectorAll('.dream-form-block').length;
      container.insertAdjacentHTML('beforeend', this.renderDreamFormBlock(currentCount));
      this.attachDynamicHandlers();
    });

    // Cancelar
    cancelBtn.addEventListener('click', () => {
      this.editingId = null;
      this.changeView('list');
    });

    // Submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveForm(new FormData(form));
    });

    this.attachDynamicHandlers();
  }

  attachDynamicHandlers() {
    // Eliminar sueño
    document.querySelectorAll('[data-remove-dream]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.dream-form-block').remove();
        this.reindexDreams();
      });
    });

    // Añadir señal
    document.querySelectorAll('[data-add-signal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dreamIndex = btn.dataset.addSignal;
        const container = document.querySelector(`[data-signals-container="${dreamIndex}"]`);
        const currentCount = container.querySelectorAll('.signal-item').length;
        container.insertAdjacentHTML('beforeend', this.renderSignalInput(dreamIndex, currentCount));
        this.attachSignalRemoveHandlers();
      });
    });

    this.attachSignalRemoveHandlers();
  }

  attachSignalRemoveHandlers() {
    document.querySelectorAll('[data-remove-signal]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.signal-item').remove();
      });
    });
  }

  reindexDreams() {
    const blocks = document.querySelectorAll('.dream-form-block');
    blocks.forEach((block, index) => {
      const letter = String.fromCharCode(65 + index);
      block.dataset.dreamIndex = index;
      block.querySelector('.dream-form-title').textContent = `Sueño ${letter}`;
      
      // Actualizar nombres de campos
      block.querySelectorAll('[name^="dream_"]').forEach(field => {
        const nameParts = field.name.split('_');
        nameParts[1] = index;
        field.name = nameParts.join('_');
      });
    });
  }

  getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // ─── GUARDAR FORMULARIO ───
  saveForm(formData) {
    if (!this.isLocalhost) {
      alert('No puedes guardar en modo público');
      return;
    }

    const isEditing = this.editingId !== null;
    
    // Generar ID si es nueva entrada
    let entryId = this.editingId;
    if (!isEditing) {
      const maxId = this.entries.reduce((max, e) => {
        const num = parseInt(e.id.substring(1));
        return num > max ? num : max;
      }, 0);
      entryId = `E${maxId + 1}`;
    }

    // Construir entrada
    const entry = {
      id: entryId,
      titulo: formData.get('titulo'),
      autor: formData.get('autor'),
      fecha: formData.get('fecha'),
      imagen_general: formData.get('imagen_general'),
      sueños: []
    };

    // Procesar sueños
    const dreamBlocks = document.querySelectorAll('.dream-form-block');
    dreamBlocks.forEach((block, index) => {
      const letter = String.fromCharCode(65 + index);
      
      // Recolectar señales
      const señales = [];
      const signalInputs = block.querySelectorAll(`[name^="dream_${index}_signal_"]`);
      signalInputs.forEach(input => {
        if (input.value.trim()) {
          señales.push(input.value.trim());
        }
      });

      entry.sueños.push({
        id: `${entryId}-${letter}`,
        descripcion: formData.get(`dream_${index}_descripcion`),
        claridad: formData.get(`dream_${index}_claridad`),
        tipo: formData.get(`dream_${index}_tipo`),
        señales: señales,
        interpretacion: formData.get(`dream_${index}_interpretacion`) || ''
      });
    });

    // Guardar o actualizar
    if (isEditing) {
      const idx = this.entries.findIndex(e => e.id === entryId);
      this.entries[idx] = entry;
    } else {
      this.entries.push(entry);
    }

    this.saveEntries();
    this.editingId = null;
    this.changeView('list');
  }

  // ─── EDITAR ENTRADA ───
  editEntry(id) {
    this.editingId = id;
    this.currentView = 'create';
    this.render();
  }

  // ─── ELIMINAR ENTRADA ───
  deleteEntry(id) {
    if (!this.isLocalhost) {
      alert('No puedes eliminar en modo público');
      return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar esta entrada? Esta acción no se puede deshacer.')) {
      this.entries = this.entries.filter(e => e.id !== id);
      this.saveEntries();
      this.changeView('list');
    }
  }

  // ─── VISTA: BÚSQUEDA ───
  renderSearch() {
    return `
      <div class="section-header">
        <div class="section-number">Búsqueda</div>
        <h2 class="section-title">Explorar Entradas</h2>
        <p class="section-subtitle">Busca por título, descripción, señales o interpretación</p>
      </div>

      <div class="search-box">
        <input type="text" 
               class="search-input" 
               id="search-input" 
               placeholder="Escribe para buscar..."
               autocomplete="off">
      </div>

      <div id="search-results" class="search-results"></div>
    `;
  }

  attachSearchHandlers() {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      
      if (!query) {
        resultsContainer.innerHTML = '';
        return;
      }

      const results = this.searchEntries(query);
      
      if (results.length === 0) {
        resultsContainer.innerHTML = `
          <div class="no-results">
            <p>No se encontraron resultados para "${query}"</p>
          </div>
        `;
      } else {
        resultsContainer.innerHTML = `
          <div class="entry-list">
            ${results.map(entry => this.renderEntryCard(entry)).join('')}
          </div>
        `;
        this.attachListHandlers();
      }
    });

    searchInput.focus();
  }

  searchEntries(query) {
    return this.entries.filter(entry => {
      // Buscar en título
      if (entry.titulo.toLowerCase().includes(query)) return true;
      
      // Buscar en autor
      if (entry.autor.toLowerCase().includes(query)) return true;
      
      // Buscar en sueños
      return entry.sueños.some(sueno => {
        if (sueno.descripcion.toLowerCase().includes(query)) return true;
        if (sueno.interpretacion.toLowerCase().includes(query)) return true;
        if (sueno.tipo.toLowerCase().includes(query)) return true;
        if (sueno.señales.some(s => s.toLowerCase().includes(query))) return true;
        return false;
      });
    });
  }

  // ─── VISTA: GESTIÓN DE DATOS ───
  renderManage() {
    return `
      <div class="section-header">
        <div class="section-number">Gestión de Datos</div>
        <h2 class="section-title">Administrar Datos del Diario</h2>
        <p class="section-subtitle">Exporta, importa o gestiona tus datos localmente</p>
      </div>

      <div class="mode-indicator">
        <span class="mode-badge ${this.isLocalhost ? 'localhost' : 'public'}">
          ${this.isLocalhost ? '🔓 Modo Localhost' : '🔒 Modo Público'}
        </span>
        <p class="mode-description">
          ${this.isLocalhost 
            ? 'Estás en modo localhost. Puedes crear, editar y exportar datos.' 
            : 'Estás en modo público (solo lectura). Descarga el proyecto para editar.'}
        </p>
      </div>

      <div class="manage-panel">
        <div class="manage-card">
          <div class="manage-card-title">📥 Importar Datos</div>
          <p>Carga un archivo datos.json para importar entradas. Esto reemplazará los datos actuales en localStorage.</p>
          <div class="manage-actions">
            <button class="btn btn-upload" id="btn-import">
              Seleccionar Archivo
            </button>
          </div>
        </div>

        <div class="manage-card">
          <div class="manage-card-title">📤 Exportar Datos</div>
          <p>Descarga tus datos actuales como datos.json. Copia este archivo a tu repositorio y haz commit para actualizar GitHub Pages.</p>
          <div class="manage-actions">
            <button class="btn btn-download btn-primary" id="btn-export">
              Descargar datos.json
            </button>
          </div>
          <p style="margin-top: 16px; font-size: 0.9rem; color: var(--parchment-dim);">
            <strong>Total de entradas:</strong> ${this.entries.length}
          </p>
        </div>

        <div class="manage-card">
          <div class="manage-card-title">🗑️ Limpiar Datos</div>
          <p><strong style="color: var(--blood);">¡Peligro!</strong> Esto eliminará TODOS los datos del localStorage. Asegúrate de haber exportado antes.</p>
          <div class="manage-actions">
            <button class="btn btn-danger" id="btn-clear">
              Limpiar localStorage
            </button>
          </div>
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-secondary" id="back-btn">← Volver</button>
      </div>
    `;
  }

  attachManageHandlers() {
    // Botón de importar
    const btnImport = document.getElementById('btn-import');
    if (btnImport) {
      btnImport.addEventListener('click', () => this.importarDatos());
    }

    // Botón de exportar
    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportarDatos());
    }

    // Botón de limpiar
    const btnClear = document.getElementById('btn-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => this.limpiarDatos());
    }

    // Botón de volver
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.changeView('list'));
    }
  }

  // ─── EXPORTAR DATOS ───
  exportarDatos() {
    if (!this.isLocalhost) {
      alert('Esta función solo está disponible en localhost');
      return;
    }

    const datos = JSON.stringify(this.entries, null, 2);
    const blob = new Blob([datos], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'datos.json';
    link.click();
    URL.revokeObjectURL(url);

    console.log('✅ datos.json descargado exitosamente');
    alert(`✅ Descargado datos.json con ${this.entries.length} entrada(s)\n\nAhora copia este archivo a tu repositorio y haz commit.`);
  }

  // ─── IMPORTAR DATOS ───
  importarDatos() {
    if (!this.isLocalhost) {
      alert('Esta función solo está disponible en localhost');
      return;
    }

    const fileInput = document.getElementById('file-input');
    
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          
          if (!Array.isArray(data)) {
            throw new Error('El archivo no contiene un array válido');
          }

          // Validar estructura básica
          if (data.length > 0 && !data[0].id) {
            throw new Error('El formato del archivo no es correcto');
          }

          // Preguntar antes de sobrescribir
          if (this.entries.length > 0) {
            if (!confirm(`Esto reemplazará tus ${this.entries.length} entrada(s) actual(es) con ${data.length} entrada(s) del archivo. ¿Continuar?`)) {
              return;
            }
          }

          this.entries = data;
          this.saveEntries();
          console.log(`✅ Importadas ${data.length} entradas`);
          alert(`✅ Importadas ${data.length} entrada(s) exitosamente`);
          this.changeView('list');
          
        } catch (error) {
          console.error('Error al importar:', error);
          alert(`❌ Error al importar datos: ${error.message}`);
        }
      };

      reader.readAsText(file);
    };

    fileInput.click();
  }

  // ─── LIMPIAR DATOS ───
  limpiarDatos() {
    if (!this.isLocalhost) {
      alert('Esta función solo está disponible en localhost');
      return;
    }

    if (!confirm('⚠️ ADVERTENCIA ⚠️\n\n¿Estás ABSOLUTAMENTE SEGURO de que quieres eliminar TODOS los datos?\n\nEsta acción NO SE PUEDE DESHACER.\n\nAsegúrate de haber exportado tus datos antes.')) {
      return;
    }

    if (!confirm('Segunda confirmación: ¿Realmente quieres borrar todo?')) {
      return;
    }

    localStorage.removeItem('diario_onirico');
    this.entries = [];
    console.log('✅ localStorage limpiado');
    alert('✅ Datos eliminados. El diario está ahora vacío.');
    this.changeView('list');
  }
}

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  new DiarioOnirico();
});