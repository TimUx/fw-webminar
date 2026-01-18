const API_BASE = '/api';
let currentWebinar = null;
let pptxFiles = [];
let quillEditors = []; // Store Quill editor instances

// Check authentication
const token = localStorage.getItem('adminToken');
if (!token) {
  window.location.href = '/admin/login.html';
}

// API helper
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  
  if (response.status === 401) {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
    return;
  }
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API-Fehler');
  }
  
  // Check if response is CSV
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return response.blob();
  }
  
  return response.json();
}

// Show notification
function showNotification(message, isError = false) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = 'notification' + (isError ? ' error' : '');
  notification.classList.remove('hidden');
  
  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}

// Helper to escape HTML entities to prevent XSS
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Helper to escape strings for use in JavaScript string literals
function escapeJs(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\0/g, '\\0')
    .replace(/\f/g, '\\f');
}

// Helper to upload image for Quill editor
async function uploadImageToServer(file) {
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`${API_BASE}/admin/slides/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }
    
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Image upload error:', error);
    showNotification('Fehler beim Hochladen des Bildes: ' + error.message, true);
    throw error;
  }
}

// Helper to insert a simple table in Quill
function insertTable(quill) {
  const rows = prompt('Anzahl der Zeilen:', '3');
  const cols = prompt('Anzahl der Spalten:', '3');
  
  if (rows && cols) {
    const numRows = parseInt(rows);
    const numCols = parseInt(cols);
    
    if (numRows > 0 && numCols > 0) {
      let tableHTML = '<table style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">\n';
      
      for (let i = 0; i < numRows; i++) {
        tableHTML += '  <tr>\n';
        for (let j = 0; j < numCols; j++) {
          const tag = i === 0 ? 'th' : 'td';
          tableHTML += `    <${tag} style="border: 1px solid #ddd; padding: 8px;">${tag === 'th' ? 'Kopfzeile' : 'Zelle'}</${tag}>\n`;
        }
        tableHTML += '  </tr>\n';
      }
      tableHTML += '</table>\n<p><br></p>';
      
      const range = quill.getSelection(true);
      quill.clipboard.dangerouslyPasteHTML(range.index, tableHTML);
      quill.setSelection(range.index + 1);
    }
  }
}

// Helper to create Quill editor with image upload and tables
function createQuillEditor(container, initialContent = '') {
  const editorDiv = document.createElement('div');
  editorDiv.className = 'quill-editor-container';
  
  // Replace textarea with Quill editor
  const textarea = container.querySelector('.slide-content');
  if (textarea) {
    textarea.style.display = 'none';
    textarea.parentNode.insertBefore(editorDiv, textarea);
  } else {
    container.appendChild(editorDiv);
  }
  
  // Variable to track selected image
  let selectedImage = null;
  
  // Initialize Quill with custom toolbar including headings and table
  const quill = new Quill(editorDiv, {
    theme: 'snow',
    placeholder: 'Folieninhalt eingeben... Sie können Text formatieren, Tabellen und Bilder hinzufügen.',
    modules: {
      toolbar: {
        container: [
          // First row: Headings and basic formatting
          [{ 'header': [2, 3, 4, 5, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          
          // Second row: Lists and alignment
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'align': [] }],
          
          // Third row: Links, images, tables
          ['link', 'image', 'table'],
          ['clean']
        ],
        handlers: {
          image: function() {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();
            
            input.onchange = async () => {
              const file = input.files[0];
              if (file) {
                // Check file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                  showNotification('Bild ist zu groß. Maximale Größe: 5MB', true);
                  return;
                }
                
                // Show loading notification
                showNotification('Bild wird hochgeladen...');
                
                try {
                  const url = await uploadImageToServer(file);
                  
                  // Insert image into editor
                  const range = this.quill.getSelection(true);
                  this.quill.insertEmbed(range.index, 'image', url);
                  this.quill.setSelection(range.index + 1);
                  
                  // Apply medium size class to the newly inserted image
                  // Use nextTick to ensure DOM is updated
                  const applyDefaultSize = () => {
                    // Find images without any size class
                    const images = this.quill.root.querySelectorAll('img:not(.img-small):not(.img-medium):not(.img-large):not(.img-full)');
                    for (let i = 0; i < images.length; i++) {
                      const img = images[i];
                      if (img.src === url) {
                        img.classList.add('img-medium');
                        break;
                      }
                    }
                  };
                  
                  // Try immediately, then with small delay as fallback
                  applyDefaultSize();
                  requestAnimationFrame(() => applyDefaultSize());
                  
                  showNotification('Bild erfolgreich hochgeladen');
                } catch (error) {
                  // Error notification already shown in uploadImageToServer
                }
              }
            };
          },
          table: function() {
            insertTable(this.quill);
          }
        }
      }
    }
  });
  
  // Handle image selection for resizing
  quill.root.addEventListener('click', (e) => {
    if (e.target.tagName === 'IMG') {
      // Deselect previous image
      if (selectedImage) {
        selectedImage.classList.remove('selected-image');
      }
      // Select new image
      selectedImage = e.target;
      selectedImage.classList.add('selected-image');
    } else {
      // Clicked outside image, deselect
      if (selectedImage) {
        selectedImage.classList.remove('selected-image');
        selectedImage = null;
      }
    }
  });
  
  // Add custom toolbar buttons for image sizing and columns
  const toolbar = quill.getModule('toolbar');
  const toolbarContainer = toolbar.container;
  
  // Create image sizing buttons section
  const imageSizingGroup = document.createElement('span');
  imageSizingGroup.className = 'ql-formats';
  imageSizingGroup.innerHTML = `
    <button class="ql-image-small" type="button" title="Bild klein (25%)">
      <span style="font-size: 10px;">S</span>
    </button>
    <button class="ql-image-medium" type="button" title="Bild mittel (50%)">
      <span style="font-size: 12px;">M</span>
    </button>
    <button class="ql-image-large" type="button" title="Bild groß (75%)">
      <span style="font-size: 14px;">L</span>
    </button>
    <button class="ql-image-full" type="button" title="Bild volle Breite (100%)">
      <span style="font-size: 16px;">XL</span>
    </button>
  `;
  toolbarContainer.appendChild(imageSizingGroup);
  
  // Create image alignment buttons section
  const imageAlignGroup = document.createElement('span');
  imageAlignGroup.className = 'ql-formats';
  imageAlignGroup.innerHTML = `
    <button class="ql-image-float-left" type="button" title="Bild links mit Textumfluss" aria-label="Bild links ausrichten">
      <span style="font-size: 12px;" aria-hidden="true">◀️</span>
    </button>
    <button class="ql-image-float-right" type="button" title="Bild rechts mit Textumfluss" aria-label="Bild rechts ausrichten">
      <span style="font-size: 12px;" aria-hidden="true">▶️</span>
    </button>
    <button class="ql-image-float-none" type="button" title="Textumfluss entfernen" aria-label="Textumfluss entfernen">
      <span style="font-size: 12px;" aria-hidden="true">⬛</span>
    </button>
  `;
  toolbarContainer.appendChild(imageAlignGroup);
  
  // Create column layout buttons section
  const columnsGroup = document.createElement('span');
  columnsGroup.className = 'ql-formats';
  columnsGroup.innerHTML = `
    <button class="ql-columns-2" type="button" title="2 Spalten einfügen" aria-label="2 Spalten Layout einfügen">
      <span style="font-size: 10px;" aria-hidden="true">▢▢</span>
    </button>
    <button class="ql-columns-3" type="button" title="3 Spalten einfügen" aria-label="3 Spalten Layout einfügen">
      <span style="font-size: 10px;" aria-hidden="true">▢▢▢</span>
    </button>
  `;
  toolbarContainer.appendChild(columnsGroup);
  
  // Helper function to set image size
  const setImageSize = (className, displayName) => {
    if (selectedImage) {
      selectedImage.classList.remove('img-small', 'img-medium', 'img-large', 'img-full');
      if (className) {
        selectedImage.classList.add(className);
      }
      showNotification(`Bildgröße auf "${displayName}" gesetzt`);
    } else {
      showNotification('Bitte wählen Sie zuerst ein Bild aus', true);
    }
  };
  
  // Helper function to set image float
  const setImageFloat = (className, displayName) => {
    if (selectedImage) {
      selectedImage.classList.remove('img-float-left', 'img-float-right');
      if (className) {
        selectedImage.classList.add(className);
      }
      showNotification(displayName);
    } else {
      showNotification('Bitte wählen Sie zuerst ein Bild aus', true);
    }
  };
  
  // Helper function to insert columns safely
  const insertColumns = (numColumns, displayName) => {
    const range = quill.getSelection(true);
    if (range) {
      // Create container div programmatically (not from user input)
      const columnsDiv = document.createElement('div');
      columnsDiv.className = `columns-${numColumns}`;
      
      // Create column divs
      for (let i = 0; i < numColumns; i++) {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'column';
        const p = document.createElement('p');
        p.textContent = `Spalte ${i + 1}`;  // Safe: uses textContent, not innerHTML
        columnDiv.appendChild(p);
        columnsDiv.appendChild(columnDiv);
      }
      
      // Note: dangerouslyPasteHTML is used here with programmatically created,
      // sanitized content (not user input). This is Quill's standard pattern
      // for inserting complex HTML structures. The content is XSS-safe.
      quill.clipboard.dangerouslyPasteHTML(range.index, columnsDiv.outerHTML + '<p><br></p>');
      quill.setSelection(range.index + 1);
      showNotification(displayName);
    }
  };
  
  // Add event listeners for image sizing buttons
  toolbarContainer.querySelector('.ql-image-small').addEventListener('click', () => {
    setImageSize('img-small', 'klein');
  });
  
  toolbarContainer.querySelector('.ql-image-medium').addEventListener('click', () => {
    setImageSize('img-medium', 'mittel');
  });
  
  toolbarContainer.querySelector('.ql-image-large').addEventListener('click', () => {
    setImageSize('img-large', 'groß');
  });
  
  toolbarContainer.querySelector('.ql-image-full').addEventListener('click', () => {
    setImageSize('img-full', 'volle Breite');
  });
  
  // Add event listeners for image alignment buttons
  toolbarContainer.querySelector('.ql-image-float-left').addEventListener('click', () => {
    setImageFloat('img-float-left', 'Bild links ausgerichtet mit Textumfluss');
  });
  
  toolbarContainer.querySelector('.ql-image-float-right').addEventListener('click', () => {
    setImageFloat('img-float-right', 'Bild rechts ausgerichtet mit Textumfluss');
  });
  
  toolbarContainer.querySelector('.ql-image-float-none').addEventListener('click', () => {
    setImageFloat(null, 'Textumfluss entfernt');
  });
  
  // Add event listeners for column layout buttons
  toolbarContainer.querySelector('.ql-columns-2').addEventListener('click', () => {
    insertColumns(2, '2-Spalten-Layout eingefügt');
  });
  
  toolbarContainer.querySelector('.ql-columns-3').addEventListener('click', () => {
    insertColumns(3, '3-Spalten-Layout eingefügt');
  });
  
  // Set initial content
  if (initialContent) {
    quill.root.innerHTML = initialContent;
    // Also sync initial content to textarea so it's saved even without changes
    if (textarea) {
      textarea.value = initialContent;
    }
  }
  
  // Sync Quill content back to hidden textarea (if it exists)
  if (textarea) {
    quill.on('text-change', () => {
      textarea.value = quill.root.innerHTML;
    });
  }
  
  return quill;
}

// Helper to get file type from filename
function getFileType(filename) {
  return filename.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PPTX';
}

// Logout
function logout() {
  localStorage.removeItem('adminToken');
  window.location.href = '/admin/login.html';
}

// Section Navigation
function showSection(sectionName) {
  const sections = document.querySelectorAll('.content-section');
  sections.forEach(s => s.classList.add('hidden'));
  
  const section = document.getElementById(`${sectionName}-section`);
  if (section) {
    section.classList.remove('hidden');
  }
  
  // Load section data
  if (sectionName === 'settings') loadSettings();
  if (sectionName === 'smtp') loadSMTP();
  if (sectionName === 'pptx') loadPPTX();
  if (sectionName === 'webinars') loadWebinars();
  if (sectionName === 'results') loadResults();
}

// ============ SETTINGS ============

async function loadSettings() {
  try {
    const settings = await apiCall('/admin/settings');
    document.getElementById('headerTitle').value = settings.headerTitle || '';
    
    if (settings.logoPath) {
      document.getElementById('currentLogo').innerHTML = `
        <p>Aktuelles Logo:</p>
        <img src="${settings.logoPath}" alt="Logo">
      `;
    }
  } catch (error) {
    showNotification('Fehler beim Laden der Einstellungen: ' + error.message, true);
  }
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const headerTitle = document.getElementById('headerTitle').value;
    await apiCall('/admin/settings', {
      method: 'PUT',
      body: { headerTitle }
    });
    
    // Upload logo if selected
    const logoFile = document.getElementById('logoFile').files[0];
    if (logoFile) {
      const formData = new FormData();
      formData.append('logo', logoFile);
      
      await apiCall('/admin/settings/logo', {
        method: 'POST',
        body: formData
      });
    }
    
    showNotification('Einstellungen erfolgreich gespeichert');
    loadSettings();
  } catch (error) {
    showNotification('Fehler: ' + error.message, true);
  }
});

// ============ SMTP ============

async function loadSMTP() {
  try {
    const smtp = await apiCall('/admin/smtp');
    document.getElementById('smtpHost').value = smtp.host || '';
    document.getElementById('smtpPort').value = smtp.port || 587;
    document.getElementById('smtpUsername').value = smtp.username || '';
    document.getElementById('smtpFrom').value = smtp.from || '';
    document.getElementById('smtpRecipient').value = smtp.recipient || '';
    document.getElementById('smtpSecure').checked = smtp.secure || false;
  } catch (error) {
    showNotification('Fehler beim Laden der SMTP-Konfiguration: ' + error.message, true);
  }
}

document.getElementById('smtpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const data = {
      host: document.getElementById('smtpHost').value,
      port: parseInt(document.getElementById('smtpPort').value),
      username: document.getElementById('smtpUsername').value,
      password: document.getElementById('smtpPassword').value,
      from: document.getElementById('smtpFrom').value,
      recipient: document.getElementById('smtpRecipient').value,
      secure: document.getElementById('smtpSecure').checked
    };
    
    await apiCall('/admin/smtp', {
      method: 'PUT',
      body: data
    });
    
    showNotification('SMTP-Konfiguration erfolgreich gespeichert');
    document.getElementById('smtpPassword').value = '';
  } catch (error) {
    showNotification('Fehler: ' + error.message, true);
  }
});

document.getElementById('testEmailForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const recipient = document.getElementById('testEmail').value;
    await apiCall('/admin/smtp/test', {
      method: 'POST',
      body: { recipient }
    });
    
    showNotification('Test-E-Mail erfolgreich gesendet!');
  } catch (error) {
    showNotification('Fehler beim Senden: ' + error.message, true);
  }
});

// ============ PPTX/PDF ============

async function loadPPTX() {
  try {
    pptxFiles = await apiCall('/admin/pptx');
    
    const list = document.getElementById('pptxList');
    if (pptxFiles.length === 0) {
      list.innerHTML = '<p>Keine Präsentationen hochgeladen.</p>';
      return;
    }
    
    list.innerHTML = pptxFiles.map(file => {
      const displayName = file.displayName || file.filename;
      const fileType = getFileType(displayName);
      return `
      <div class="pptx-item">
        <div class="pptx-info">
          <strong>${escapeHtml(displayName)}</strong> <span style="color: #7f8c8d; font-size: 14px;">(${fileType})</span>
          <small>Größe: ${(file.size / 1024 / 1024).toFixed(2)} MB | Hochgeladen: ${new Date(file.uploadedAt).toLocaleDateString('de-DE')}</small>
        </div>
        <div class="pptx-actions">
          <button class="btn-danger" onclick="deletePPTX('${escapeJs(file.filename)}')">Löschen</button>
        </div>
      </div>
    `;
    }).join('');
    
    // Update webinar form dropdown
    updatePPTXDropdown();
  } catch (error) {
    showNotification('Fehler beim Laden der Präsentationen: ' + error.message, true);
  }
}

document.getElementById('pptxUploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const file = document.getElementById('pptxFile').files[0];
    if (!file) {
      throw new Error('Keine Datei ausgewählt');
    }
    
    const fileType = getFileType(file.name);
    
    const formData = new FormData();
    formData.append('pptx', file);
    
    await apiCall('/admin/pptx/upload', {
      method: 'POST',
      body: formData
    });
    
    showNotification(`${fileType} erfolgreich hochgeladen`);
    document.getElementById('pptxFile').value = '';
    loadPPTX();
  } catch (error) {
    showNotification('Fehler: ' + error.message, true);
  }
});

async function deletePPTX(filename) {
  // Find the file object to get the display name
  const file = pptxFiles.find(f => f.filename === filename);
  const displayName = file ? (file.displayName || file.filename) : filename;
  const fileType = getFileType(displayName);
  if (!confirm(`${fileType} "${displayName}" wirklich löschen?`)) return;
  
  try {
    await apiCall(`/admin/pptx/${filename}`, { method: 'DELETE' });
    showNotification(`${fileType} erfolgreich gelöscht`);
    loadPPTX();
  } catch (error) {
    showNotification('Fehler: ' + error.message, true);
  }
}

function updatePPTXDropdown() {
  const select = document.getElementById('webinarPptx');
  select.innerHTML = '<option value="">Keine Präsentationsdatei</option>' +
    pptxFiles.map(f => {
      const displayName = f.displayName || f.filename;
      const fileType = getFileType(displayName);
      return `<option value="${f.filename}">${escapeHtml(displayName)} (${fileType})</option>`;
    }).join('');
}

// ============ WEBINARS ============

async function loadWebinars() {
  try {
    const webinars = await apiCall('/admin/webinars');
    
    const list = document.getElementById('webinarList');
    if (webinars.length === 0) {
      list.innerHTML = '<p>Keine Webinare vorhanden.</p>';
      return;
    }
    
    list.innerHTML = webinars.map(webinar => `
      <div class="webinar-item">
        <h3>${webinar.title}</h3>
        <p>PPTX: ${webinar.pptxFile || 'Keine'}</p>
        <p>Folien: ${webinar.slides?.length || 0}</p>
        <p>Fragen: ${webinar.questions?.length || 0}</p>
        <p>Erstellt: ${new Date(webinar.createdAt).toLocaleDateString('de-DE')}</p>
        <div class="webinar-actions">
          <button onclick="editWebinar('${webinar.id}')">Bearbeiten</button>
          <button onclick="viewWebinar('${webinar.id}')" class="btn-secondary">Vorschau</button>
          <button class="btn-danger" onclick="deleteWebinar('${webinar.id}')">Löschen</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    showNotification('Fehler beim Laden der Webinare: ' + error.message, true);
  }
}

function showCreateWebinar() {
  currentWebinar = null;
  // Clear Quill editors array
  quillEditors = [];
  
  document.getElementById('modalTitle').textContent = 'Neues Webinar';
  document.getElementById('webinarId').value = '';
  document.getElementById('webinarTitle').value = '';
  document.getElementById('webinarPptx').value = '';
  document.getElementById('slidesContainer').innerHTML = '';
  document.getElementById('questionsContainer').innerHTML = '';
  
  loadPPTX(); // Ensure PPTX list is loaded
  document.getElementById('webinarModal').classList.remove('hidden');
}

async function editWebinar(id) {
  try {
    currentWebinar = await apiCall(`/admin/webinars/${id}`);
    
    // Clear Quill editors array
    quillEditors = [];
    
    document.getElementById('modalTitle').textContent = 'Webinar bearbeiten';
    document.getElementById('webinarId').value = currentWebinar.id;
    document.getElementById('webinarTitle').value = currentWebinar.title;
    document.getElementById('webinarPptx').value = currentWebinar.pptxFile || '';
    
    // Load slides
    const slidesContainer = document.getElementById('slidesContainer');
    slidesContainer.innerHTML = '';
    (currentWebinar.slides || []).forEach((slide, index) => {
      addSlide(slide);
    });
    
    // Load questions
    const questionsContainer = document.getElementById('questionsContainer');
    questionsContainer.innerHTML = '';
    (currentWebinar.questions || []).forEach((question, index) => {
      addQuestion(question);
    });
    
    await loadPPTX(); // Ensure PPTX dropdown is populated
    document.getElementById('webinarModal').classList.remove('hidden');
  } catch (error) {
    showNotification('Fehler: ' + error.message, true);
  }
}

function closeWebinarModal() {
  document.getElementById('webinarModal').classList.add('hidden');
  currentWebinar = null;
  
  // Clear Quill editors when closing modal
  quillEditors = [];
}

function viewWebinar(id) {
  window.open(`/webinar/?id=${id}`, '_blank');
}

async function deleteWebinar(id) {
  if (!confirm('Webinar wirklich löschen?')) return;
  
  try {
    await apiCall(`/admin/webinars/${id}`, { method: 'DELETE' });
    showNotification('Webinar erfolgreich gelöscht');
    loadWebinars();
  } catch (error) {
    showNotification('Fehler: ' + error.message, true);
  }
}

// Slide management
function addSlide(slide = null) {
  const container = document.getElementById('slidesContainer');
  const index = container.children.length;
  
  const div = document.createElement('div');
  div.className = 'slide-item';
  div.innerHTML = `
    <div class="slide-header">
      <h4 class="slide-number">Folie ${index + 1}</h4>
      <div class="slide-controls">
        <button type="button" class="btn-icon" onclick="moveSlideUp(this)" title="Nach oben">▲</button>
        <button type="button" class="btn-icon" onclick="moveSlideDown(this)" title="Nach unten">▼</button>
        <button type="button" class="btn-danger" onclick="removeSlide(this)">Entfernen</button>
      </div>
    </div>
    <div class="form-group">
      <label>Folien-Titel</label>
      <input type="text" class="slide-title" value="${escapeHtml(slide?.title || '')}" placeholder="Folie ${index + 1}">
    </div>
    <div class="form-group">
      <label>Inhalt (WYSIWYG Editor mit Bildupload und Tabellen)</label>
      <textarea class="slide-content" style="display:none;">${escapeHtml(slide?.content || '')}</textarea>
    </div>
    <div class="form-group">
      <label>Sprechernotiz (für Sprachausgabe)</label>
      <textarea class="slide-note" placeholder="Text für automatische Sprachausgabe">${escapeHtml(slide?.speakerNote || '')}</textarea>
    </div>
  `;
  
  container.appendChild(div);
  
  // Initialize Quill editor for this slide's content
  const contentContainer = div.querySelector('.form-group:nth-child(3)');
  const quillEditor = createQuillEditor(contentContainer, slide?.content || '');
  quillEditors.push(quillEditor);
  
  // Update all slide numbers after adding
  updateSlideNumbers();
}

// Helper function to remove a slide and its Quill editor
function removeSlide(button) {
  const slideItem = button.closest('.slide-item');
  const container = document.getElementById('slidesContainer');
  const slideIndex = Array.from(container.children).indexOf(slideItem);
  
  // Remove the corresponding Quill editor from our tracking array
  if (slideIndex >= 0 && slideIndex < quillEditors.length) {
    quillEditors.splice(slideIndex, 1);
  }
  
  slideItem.remove();
  
  // Update slide numbers after removing
  updateSlideNumbers();
}

// Helper function to move a slide up
function moveSlideUp(button) {
  const slideItem = button.closest('.slide-item');
  const container = document.getElementById('slidesContainer');
  const slideIndex = Array.from(container.children).indexOf(slideItem);
  
  if (slideIndex > 0) {
    // Swap in DOM
    const previousSlide = container.children[slideIndex - 1];
    container.insertBefore(slideItem, previousSlide);
    
    // Swap in Quill editors array
    const temp = quillEditors[slideIndex];
    quillEditors[slideIndex] = quillEditors[slideIndex - 1];
    quillEditors[slideIndex - 1] = temp;
    
    // Update slide numbers
    updateSlideNumbers();
  }
}

// Helper function to move a slide down
function moveSlideDown(button) {
  const slideItem = button.closest('.slide-item');
  const container = document.getElementById('slidesContainer');
  const slideIndex = Array.from(container.children).indexOf(slideItem);
  
  if (slideIndex < container.children.length - 1) {
    // Swap in DOM
    const nextSlide = container.children[slideIndex + 1];
    container.insertBefore(nextSlide, slideItem);
    
    // Swap in Quill editors array
    const temp = quillEditors[slideIndex];
    quillEditors[slideIndex] = quillEditors[slideIndex + 1];
    quillEditors[slideIndex + 1] = temp;
    
    // Update slide numbers
    updateSlideNumbers();
  }
}

// Helper function to update all slide numbers
function updateSlideNumbers() {
  const container = document.getElementById('slidesContainer');
  const slides = container.children;
  
  Array.from(slides).forEach((slide, index) => {
    const numberElement = slide.querySelector('.slide-number');
    if (numberElement) {
      numberElement.textContent = `Folie ${index + 1}`;
    }
  });
}

// Question management
function addQuestion(question = null) {
  const container = document.getElementById('questionsContainer');
  const index = container.children.length;
  
  const div = document.createElement('div');
  div.className = 'question-item';
  div.innerHTML = `
    <div class="form-group">
      <label>Frage</label>
      <input type="text" class="question-text" value="${question?.question || ''}" placeholder="Frage ${index + 1}">
    </div>
    <div class="form-group">
      <label>Antworten</label>
      <div class="answer-inputs">
        ${(question?.answers || ['', '', '', '']).map((ans, i) => `
          <div class="answer-input">
            <input type="radio" name="correct-${index}" value="${i}" ${(question?.correctAnswer === i) ? 'checked' : ''}>
            <input type="text" class="answer-text" value="${ans}" placeholder="Antwort ${i + 1}">
          </div>
        `).join('')}
      </div>
      <small>Markieren Sie die richtige Antwort</small>
    </div>
    <button type="button" class="btn-danger" onclick="this.parentElement.remove()">Frage entfernen</button>
  `;
  
  container.appendChild(div);
}

document.getElementById('webinarForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const id = document.getElementById('webinarId').value;
    const title = document.getElementById('webinarTitle').value;
    const pptxFile = document.getElementById('webinarPptx').value;
    
    // Collect slides - get content from Quill editors
    const slideItems = Array.from(document.querySelectorAll('.slide-item'));
    const slides = slideItems.map((item, index) => {
      // Get content from the hidden textarea (which is synced with Quill)
      const contentTextarea = item.querySelector('.slide-content');
      const content = contentTextarea ? contentTextarea.value : '';
      
      return {
        title: item.querySelector('.slide-title').value,
        content: content,
        speakerNote: item.querySelector('.slide-note').value
      };
    });
    
    // Collect questions
    const questions = Array.from(document.querySelectorAll('.question-item')).map((item, qIndex) => {
      const answers = Array.from(item.querySelectorAll('.answer-text')).map(input => input.value);
      const correctRadio = item.querySelector(`input[name="correct-${qIndex}"]:checked`);
      const correctAnswer = correctRadio ? parseInt(correctRadio.value) : 0;
      
      return {
        question: item.querySelector('.question-text').value,
        answers,
        correctAnswer
      };
    });
    
    const data = { title, pptxFile, slides, questions };
    
    // Show loading message if creating new webinar with PPTX but no slides
    const willAutoAnalyze = !id && pptxFile && slides.length === 0;
    if (willAutoAnalyze) {
      const fileType = getFileType(pptxFile);
      showNotification(`Webinar wird erstellt und ${fileType} wird analysiert... Dies kann einige Sekunden dauern.`);
    }
    
    if (id) {
      await apiCall(`/admin/webinars/${id}`, {
        method: 'PUT',
        body: data
      });
      showNotification('Webinar erfolgreich aktualisiert');
    } else {
      const result = await apiCall('/admin/webinars', {
        method: 'POST',
        body: data
      });
      
      // Show success message with slide count if auto-analyzed
      if (willAutoAnalyze && result.slides && result.slides.length > 0) {
        showNotification(`Webinar erfolgreich erstellt! ${result.slides.length} Folien wurden automatisch generiert.`);
      } else {
        showNotification('Webinar erfolgreich erstellt');
      }
    }
    
    closeWebinarModal();
    loadWebinars();
  } catch (error) {
    showNotification('Fehler: ' + error.message, true);
  }
});

// ============ RESULTS ============

async function loadResults() {
  try {
    const results = await apiCall('/admin/results');
    
    const container = document.getElementById('resultsTable');
    if (results.length === 0) {
      container.innerHTML = '<p>Keine Ergebnisse vorhanden.</p>';
      return;
    }
    
    container.innerHTML = `
      <table class="results-table">
        <thead>
          <tr>
            <th>Webinar</th>
            <th>Name</th>
            <th>E-Mail</th>
            <th>Punkte</th>
            <th>Prozent</th>
            <th>Status</th>
            <th>Datum</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(result => `
            <tr>
              <td>${result.webinarTitle}</td>
              <td>${result.participantName}</td>
              <td>${result.participantEmail}</td>
              <td>${result.score}/${result.totalQuestions}</td>
              <td>${result.percentage}%</td>
              <td><span class="badge ${result.passed ? 'badge-success' : 'badge-danger'}">${result.passed ? 'Bestanden' : 'Nicht bestanden'}</span></td>
              <td>${new Date(result.completedAt).toLocaleString('de-DE')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    showNotification('Fehler beim Laden der Ergebnisse: ' + error.message, true);
  }
}

async function exportResults() {
  try {
    const blob = await apiCall('/admin/results/export');
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webinar-ergebnisse-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification('Ergebnisse erfolgreich exportiert');
  } catch (error) {
    showNotification('Fehler beim Export: ' + error.message, true);
  }
}

// ============ IMPORT MODAL ============

function showImportModal() {
  document.getElementById('importModal').classList.remove('hidden');
  loadImportedFiles();
}

function closeImportModal() {
  document.getElementById('importModal').classList.add('hidden');
  document.getElementById('importFiles').value = '';
  document.getElementById('importFilesList').innerHTML = '';
}

// Show selected files preview
document.getElementById('importFiles').addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  const listDiv = document.getElementById('importFilesList');
  
  if (files.length === 0) {
    listDiv.innerHTML = '';
    return;
  }
  
  listDiv.innerHTML = `
    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
      <strong>Ausgewählte Dateien (${files.length}):</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        ${files.map(f => {
          const fileType = getFileType(f.name);
          const sizeInMB = (f.size / 1024 / 1024).toFixed(2);
          return `<li>${f.name} <span style="color: #7f8c8d;">(${fileType}, ${sizeInMB} MB)</span></li>`;
        }).join('')}
      </ul>
    </div>
  `;
});

// Handle import form submission
document.getElementById('importForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const files = document.getElementById('importFiles').files;
  if (files.length === 0) {
    showNotification('Bitte wählen Sie mindestens eine Datei aus', true);
    return;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const file of files) {
    try {
      const formData = new FormData();
      formData.append('pptx', file);
      
      await apiCall('/admin/pptx/upload', {
        method: 'POST',
        body: formData
      });
      
      successCount++;
    } catch (error) {
      console.error(`Fehler beim Hochladen von ${file.name}:`, error);
      errorCount++;
    }
  }
  
  if (successCount > 0) {
    showNotification(`${successCount} Datei(en) erfolgreich importiert!`);
  }
  if (errorCount > 0) {
    showNotification(`${errorCount} Datei(en) konnten nicht importiert werden`, true);
  }
  
  // Reset form and reload list
  document.getElementById('importFiles').value = '';
  document.getElementById('importFilesList').innerHTML = '';
  loadImportedFiles();
  loadPPTX(); // Also update main PPTX list if user navigates there
});

// Load imported files list in modal
async function loadImportedFiles() {
  try {
    const files = await apiCall('/admin/pptx');
    const listDiv = document.getElementById('importedFilesList');
    
    if (files.length === 0) {
      listDiv.innerHTML = '<p style="color: #7f8c8d;">Noch keine Präsentationen importiert.</p>';
      return;
    }
    
    listDiv.innerHTML = files.map(file => {
      const displayName = file.displayName || file.filename;
      const fileType = getFileType(displayName);
      return `
        <div class="pptx-item">
          <div class="pptx-info">
            <strong>${escapeHtml(displayName)}</strong> <span style="color: #7f8c8d; font-size: 14px;">(${fileType})</span>
            <small>Größe: ${(file.size / 1024 / 1024).toFixed(2)} MB | Hochgeladen: ${new Date(file.uploadedAt).toLocaleDateString('de-DE')}</small>
          </div>
          <div class="pptx-actions">
            <button class="btn-danger" onclick="deleteImportedFile('${escapeJs(file.filename)}', '${escapeJs(displayName)}')">Löschen</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Fehler beim Laden der importierten Dateien:', error);
  }
}

async function deleteImportedFile(filename, displayName) {
  const name = displayName || filename;
  const fileType = getFileType(name);
  if (!confirm(`${fileType} "${name}" wirklich löschen?`)) return;
  
  try {
    await apiCall(`/admin/pptx/${filename}`, { method: 'DELETE' });
    showNotification(`${fileType} erfolgreich gelöscht`);
    loadImportedFiles();
    loadPPTX(); // Also update main list
  } catch (error) {
    showNotification('Fehler beim Löschen: ' + error.message, true);
  }
}

// Initialize
showSection('webinars');

// ============ HELP MODAL ============

function showHelpModal() {
  document.getElementById('helpModal').classList.remove('hidden');
}

function closeHelpModal() {
  document.getElementById('helpModal').classList.add('hidden');
}
