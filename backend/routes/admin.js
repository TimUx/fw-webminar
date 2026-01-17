const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { authMiddleware, authMiddlewareSSE } = require('../middleware/auth');
const { Storage } = require('../utils/storage');
const { logAudit } = require('../utils/logger');
const { sendTestEmail } = require('../services/mail');
const { generateSimpleSlides } = require('../services/pptx');
const { analyzePresentation, progressTracker, SSE_POLL_INTERVAL } = require('../services/slideAnalyzer');

const router = express.Router();

// Storage instances
const settingsStorage = new Storage('settings.json');
const smtpStorage = new Storage('smtp.json');
const webinarsStorage = new Storage('webinars.json');
const resultsStorage = new Storage('results.json');

// SSE endpoint with special auth handling (defined before global authMiddleware is applied)
/**
 * GET /api/admin/pptx/analyze/progress/:sessionId
 * Get analysis progress via Server-Sent Events
 */
router.get('/pptx/analyze/progress/:sessionId', authMiddlewareSSE, (req, res) => {
  const { sessionId } = req.params;
  
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send progress updates at configurable interval
  const intervalId = setInterval(() => {
    const progress = progressTracker.get(sessionId);
    
    if (!progress) {
      res.write(`data: ${JSON.stringify({ error: 'Session not found' })}\n\n`);
      clearInterval(intervalId);
      res.end();
      return;
    }
    
    res.write(`data: ${JSON.stringify(progress)}\n\n`);
    
    // End stream when completed or error
    if (progress.status === 'completed' || progress.status === 'error') {
      clearInterval(intervalId);
      setTimeout(() => {
        progressTracker.delete(sessionId);
        res.end();
      }, 1000);
    }
  }, SSE_POLL_INTERVAL);
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(intervalId);
  });
});

// Apply authentication to all other admin routes
router.use(authMiddleware);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = file.fieldname === 'logo' 
      ? path.join(__dirname, '../../assets') 
      : path.join(__dirname, '../../uploads');
    
    // Ensure directory exists (async with callback pattern)
    fsSync.mkdir(dir, { recursive: true }, (err) => {
      if (err) {
        return cb(err);
      }
      cb(null, dir);
    });
  },
  filename: (req, file, cb) => {
    // Use original filename
    // If file exists, append number to prevent collisions
    const originalName = file.originalname;
    const dir = file.fieldname === 'logo' 
      ? path.join(__dirname, '../../assets') 
      : path.join(__dirname, '../../uploads');
    
    // Check if file exists and find a unique name if needed
    let finalName = originalName;
    let counter = 1;
    
    while (fsSync.existsSync(path.join(dir, finalName))) {
      const ext = path.extname(originalName);
      const nameWithoutExt = path.basename(originalName, ext);
      finalName = `${nameWithoutExt} (${counter})${ext}`;
      counter++;
    }
    
    cb(null, finalName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'pptx') {
      if (!file.originalname.match(/\.(pptx|ppt|pdf)$/i)) {
        return cb(new Error('Nur PPTX/PPT/PDF-Dateien sind erlaubt'));
      }
    } else if (file.fieldname === 'logo') {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
        return cb(new Error('Nur Bilddateien sind erlaubt'));
      }
    }
    cb(null, true);
  }
});

// ============ SETTINGS ============

/**
 * GET /api/admin/settings
 * Get current settings
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await settingsStorage.read();
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Einstellungen' });
  }
});

/**
 * PUT /api/admin/settings
 * Update settings
 */
router.put('/settings', async (req, res) => {
  try {
    const { headerTitle } = req.body;
    
    const settings = await settingsStorage.update(data => ({
      ...data,
      headerTitle: headerTitle || data.headerTitle,
      updatedAt: new Date().toISOString()
    }));
    
    logAudit('SETTINGS_UPDATE', req.user.username, 'Einstellungen aktualisiert');
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Einstellungen' });
  }
});

/**
 * POST /api/admin/settings/logo
 * Upload logo
 */
router.post('/settings/logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }
    
    const logoPath = `/assets/${req.file.filename}`;
    
    const settings = await settingsStorage.update(data => ({
      ...data,
      logoPath,
      updatedAt: new Date().toISOString()
    }));
    
    logAudit('LOGO_UPLOAD', req.user.username, `Logo hochgeladen: ${req.file.filename}`);
    res.json({ logoPath, settings });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Hochladen des Logos' });
  }
});

// ============ SMTP ============

/**
 * GET /api/admin/smtp
 * Get SMTP configuration (without password)
 */
router.get('/smtp', async (req, res) => {
  try {
    const smtp = await smtpStorage.read();
    // Don't send password to client
    const { password, ...safeConfig } = smtp || {};
    res.json(safeConfig);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der SMTP-Konfiguration' });
  }
});

/**
 * PUT /api/admin/smtp
 * Update SMTP configuration
 */
router.put('/smtp', async (req, res) => {
  try {
    const { host, port, username, password, secure, from, recipient } = req.body;
    
    const smtp = await smtpStorage.update(data => ({
      host: host || data.host,
      port: port || data.port,
      username: username || data.username,
      password: password || data.password,
      secure: secure !== undefined ? secure : data.secure,
      from: from || data.from,
      recipient: recipient || data.recipient,
      updatedAt: new Date().toISOString()
    }));
    
    logAudit('SMTP_UPDATE', req.user.username, 'SMTP-Konfiguration aktualisiert');
    
    const { password: _, ...safeConfig } = smtp;
    res.json(safeConfig);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren der SMTP-Konfiguration' });
  }
});

/**
 * POST /api/admin/smtp/test
 * Send test email
 */
router.post('/smtp/test', async (req, res) => {
  try {
    const { recipient } = req.body;
    
    if (!recipient) {
      return res.status(400).json({ error: 'Empfänger-E-Mail erforderlich' });
    }
    
    await sendTestEmail(recipient);
    logAudit('SMTP_TEST', req.user.username, `Test-E-Mail gesendet an ${recipient}`);
    
    res.json({ message: 'Test-E-Mail erfolgreich gesendet' });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.status(500).json({ error: `SMTP-Test fehlgeschlagen: ${error.message}` });
  }
});

// ============ PPTX MANAGEMENT ============

/**
 * GET /api/admin/pptx
 * List uploaded PPTX/PDF files
 */
router.get('/pptx', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const files = await fs.readdir(uploadsDir);
    const pptxFiles = files.filter(f => f.match(/\.(pptx|ppt|pdf)$/i));
    
    const fileDetails = await Promise.all(pptxFiles.map(async (filename) => {
      const filepath = path.join(uploadsDir, filename);
      const stats = await fs.stat(filepath);
      return {
        filename,
        displayName: filename, // Original filename is now the actual filename
        size: stats.size,
        uploadedAt: stats.birthtime
      };
    }));
    
    res.json(fileDetails);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der PPTX-Dateien' });
  }
});

/**
 * POST /api/admin/pptx/upload
 * Upload PPTX/PDF file
 */
router.post('/pptx/upload', upload.single('pptx'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }
    
    const fileType = req.file.originalname.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PPTX';
    logAudit('FILE_UPLOAD', req.user.username, `${fileType} hochgeladen: ${req.file.filename}`);
    
    res.json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Hochladen der Datei' });
  }
});

/**
 * DELETE /api/admin/pptx/:filename
 * Delete PPTX/PDF file
 */
router.delete('/pptx/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../../uploads', filename);
    
    await fs.unlink(filepath);
    const fileType = filename.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PPTX';
    logAudit('FILE_DELETE', req.user.username, `${fileType} gelöscht: ${filename}`);
    
    res.json({ message: 'Datei erfolgreich gelöscht' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }
    res.status(500).json({ error: 'Fehler beim Löschen der Datei' });
  }
});

/**
 * POST /api/admin/pptx/:filename/analyze
 * Analyze PPTX/PDF file and extract slides
 */
router.post('/pptx/:filename/analyze', async (req, res) => {
  try {
    const { filename } = req.params;
    const { webinarId } = req.body;
    
    if (!webinarId) {
      return res.status(400).json({ error: 'Webinar-ID erforderlich' });
    }
    
    // Generate session ID for progress tracking
    const sessionId = `${webinarId}-${Date.now()}`;
    
    const fileType = filename.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PPTX';
    logAudit('FILE_ANALYZE', req.user.username, `${fileType} Analyse gestartet: ${filename}`);
    
    // Start analysis in background
    analyzePresentation(filename, webinarId, sessionId)
      .catch(error => {
        console.error('Analysis failed:', error);
      });
    
    // Return session ID for progress tracking
    res.json({ 
      sessionId,
      message: 'Analyse gestartet'
    });
  } catch (error) {
    console.error('Analysis start error:', error);
    res.status(500).json({ error: 'Fehler beim Starten der Analyse' });
  }
});

// ============ WEBINAR MANAGEMENT ============

/**
 * GET /api/admin/webinars
 * List all webinars
 */
router.get('/webinars', async (req, res) => {
  try {
    const data = await webinarsStorage.read();
    res.json(data?.webinars || []);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Webinare' });
  }
});

/**
 * POST /api/admin/webinars
 * Create new webinar
 */
router.post('/webinars', async (req, res) => {
  try {
    const { title, pptxFile, questions, slides } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Titel erforderlich' });
    }
    
    const webinar = {
      id: Date.now().toString(),
      title,
      pptxFile: pptxFile || null,
      questions: questions || [],
      slides: slides || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // If pptxFile is provided but no slides, automatically analyze and generate slides
    if (pptxFile && (!slides || slides.length === 0)) {
      try {
        const sessionId = `${webinar.id}-${Date.now()}`;
        
        logAudit('FILE_ANALYZE', req.user.username, `Auto-analysiere: ${pptxFile} für Webinar: ${title}`);
        
        // Analyze presentation synchronously
        const analyzedSlides = await analyzePresentation(pptxFile, webinar.id, sessionId);
        webinar.slides = analyzedSlides;
        
        // Generate slides presentation
        await generateSimpleSlides(webinar.id, analyzedSlides);
      } catch (analyzeError) {
        console.error('Auto-analysis failed:', analyzeError);
        // Continue creating webinar even if analysis fails
        logAudit('FILE_ANALYZE_ERROR', req.user.username, `Auto-Analyse fehlgeschlagen: ${analyzeError.message}`);
      }
    } else if (slides && slides.length > 0) {
      // Generate slides if provided manually
      await generateSimpleSlides(webinar.id, slides);
    }
    
    await webinarsStorage.update(data => {
      if (!data.webinars) data.webinars = [];
      data.webinars.push(webinar);
      return data;
    });
    
    logAudit('WEBINAR_CREATE', req.user.username, `Webinar erstellt: ${title}`);
    res.status(201).json(webinar);
  } catch (error) {
    console.error('Create webinar error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Webinars' });
  }
});

/**
 * GET /api/admin/webinars/:id
 * Get single webinar
 */
router.get('/webinars/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await webinarsStorage.read();
    const webinar = data?.webinars?.find(w => w.id === id);
    
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar nicht gefunden' });
    }
    
    res.json(webinar);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden des Webinars' });
  }
});

/**
 * PUT /api/admin/webinars/:id
 * Update webinar
 */
router.put('/webinars/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, pptxFile, questions, slides } = req.body;
    
    const data = await webinarsStorage.update(data => {
      if (!data.webinars) data.webinars = [];
      const index = data.webinars.findIndex(w => w.id === id);
      
      if (index === -1) {
        throw new Error('Webinar nicht gefunden');
      }
      
      data.webinars[index] = {
        ...data.webinars[index],
        title: title || data.webinars[index].title,
        pptxFile: pptxFile !== undefined ? pptxFile : data.webinars[index].pptxFile,
        questions: questions || data.webinars[index].questions,
        slides: slides || data.webinars[index].slides,
        updatedAt: new Date().toISOString()
      };
      
      return data;
    });
    
    // Regenerate slides if updated
    if (slides && slides.length > 0) {
      await generateSimpleSlides(id, slides);
    }
    
    const webinar = data.webinars.find(w => w.id === id);
    logAudit('WEBINAR_UPDATE', req.user.username, `Webinar aktualisiert: ${webinar.title}`);
    
    res.json(webinar);
  } catch (error) {
    console.error('Update webinar error:', error);
    if (error.message === 'Webinar nicht gefunden') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Webinars' });
  }
});

/**
 * DELETE /api/admin/webinars/:id
 * Delete webinar
 */
router.delete('/webinars/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await webinarsStorage.update(data => {
      if (!data.webinars) data.webinars = [];
      const index = data.webinars.findIndex(w => w.id === id);
      
      if (index === -1) {
        throw new Error('Webinar nicht gefunden');
      }
      
      const webinar = data.webinars[index];
      data.webinars.splice(index, 1);
      
      logAudit('WEBINAR_DELETE', req.user.username, `Webinar gelöscht: ${webinar.title}`);
      
      return data;
    });
    
    // Delete slides directory
    const slidesDir = path.join(__dirname, '../../slides', id);
    try {
      await fs.rm(slidesDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Error deleting slides directory:', err);
    }
    
    res.json({ message: 'Webinar erfolgreich gelöscht' });
  } catch (error) {
    if (error.message === 'Webinar nicht gefunden') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Fehler beim Löschen des Webinars' });
  }
});

// ============ RESULTS ============

/**
 * GET /api/admin/results
 * Get all results
 */
router.get('/results', async (req, res) => {
  try {
    const data = await resultsStorage.read();
    res.json(data?.results || []);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Ergebnisse' });
  }
});

/**
 * GET /api/admin/results/export
 * Export results as CSV
 */
router.get('/results/export', async (req, res) => {
  try {
    const data = await resultsStorage.read();
    const results = data?.results || [];
    
    // Create CSV
    const headers = ['Webinar', 'Name', 'E-Mail', 'Punkte', 'Gesamt', 'Prozent', 'Bestanden', 'Datum'];
    const rows = results.map(r => [
      r.webinarTitle,
      r.participantName,
      r.participantEmail,
      r.score,
      r.totalQuestions,
      r.percentage,
      r.passed ? 'Ja' : 'Nein',
      new Date(r.completedAt).toLocaleString('de-DE')
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=webinar-ergebnisse.csv');
    res.send('\ufeff' + csv); // UTF-8 BOM for Excel
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Exportieren der Ergebnisse' });
  }
});

module.exports = router;
