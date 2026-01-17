const API_BASE = '/api';
let currentWebinar = null;
let pptxFiles = [];

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
      const fileType = displayName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PPTX';
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
    
    const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PPTX';
    
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
  const fileType = displayName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PPTX';
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
      const fileType = displayName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PPTX';
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
    <div class="form-group">
      <label>Folien-Titel</label>
      <input type="text" class="slide-title" value="${slide?.title || ''}" placeholder="Folie ${index + 1}">
    </div>
    <div class="form-group">
      <label>Inhalt</label>
      <textarea class="slide-content" placeholder="Folieninhalt (HTML erlaubt)">${slide?.content || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Sprechernotiz (für Sprachausgabe)</label>
      <textarea class="slide-note" placeholder="Text für automatische Sprachausgabe">${slide?.speakerNote || ''}</textarea>
    </div>
    <button type="button" class="btn-danger" onclick="this.parentElement.remove()">Folie entfernen</button>
  `;
  
  container.appendChild(div);
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
    
    // Collect slides
    const slides = Array.from(document.querySelectorAll('.slide-item')).map(item => ({
      title: item.querySelector('.slide-title').value,
      content: item.querySelector('.slide-content').value,
      speakerNote: item.querySelector('.slide-note').value
    }));
    
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
      const fileType = pptxFile.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PPTX';
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
          const fileType = f.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PPTX';
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
      const fileType = displayName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PPTX';
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
  const fileType = name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PPTX';
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
showSection('settings');
