const express = require('express');
const { Storage } = require('../utils/storage');
const { sendResultEmail, sendAdminNotification } = require('../services/mail');
const { logAudit } = require('../utils/logger');
const { generateSlideHtml } = require('../renderer/slideRenderer');

const router = express.Router();

const webinarsStorage = new Storage('webinars.json');
const resultsStorage = new Storage('results.json');
const settingsStorage = new Storage('settings.json');

/**
 * GET /api/webinar/settings
 * Get public settings (header, logo)
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await settingsStorage.read();
    res.json({
      headerTitle: settings?.headerTitle || 'Webinar Platform',
      logoPath: settings?.logoPath || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Einstellungen' });
  }
});

/**
 * GET /api/webinar/list
 * List all public webinars
 */
router.get('/list', async (req, res) => {
  try {
    const data = await webinarsStorage.read();
    const webinars = (data?.webinars || []).map(w => ({
      id: w.id,
      title: w.title,
      createdAt: w.createdAt
    }));
    res.json(webinars);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Webinare' });
  }
});

/**
 * GET /api/webinar/:id
 * Get webinar details for presentation
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await webinarsStorage.read();
    const webinar = data?.webinars?.find(w => w.id === id);
    
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar nicht gefunden' });
    }
    
    // Return webinar with slides and questions
    res.json({
      id: webinar.id,
      title: webinar.title,
      slides: webinar.slides || [],
      questions: webinar.questions || []
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden des Webinars' });
  }
});

/**
 * GET /api/webinar/:id/slides-html
 * Get rendered slides HTML for direct reveal.js integration
 */
router.get('/:id/slides-html', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await webinarsStorage.read();
    const webinar = data?.webinars?.find(w => w.id === id);
    
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar nicht gefunden' });
    }
    
    // Generate HTML for all slides
    const slides = webinar.slides || [];
    const slidesHtml = slides.map(slide => generateSlideHtml(slide)).join('\n');
    
    res.json({
      slidesHtml: slidesHtml
    });
  } catch (error) {
    console.error('Error generating slides HTML:', error);
    res.status(500).json({ error: 'Fehler beim Generieren der Slides' });
  }
});

/**
 * POST /api/webinar/:id/submit
 * Submit learning control results
 */
router.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, answers, confirmed } = req.body;
    
    if (!name || !email || !answers) {
      return res.status(400).json({ error: 'Name, E-Mail und Antworten erforderlich' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
    }
    
    // Get webinar
    const data = await webinarsStorage.read();
    const webinar = data?.webinars?.find(w => w.id === id);
    
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar nicht gefunden' });
    }
    
    // Calculate score
    let score = 0;
    const questions = webinar.questions || [];
    
    answers.forEach((answer, index) => {
      if (questions[index] && questions[index].correctAnswer === answer) {
        score++;
      }
    });
    
    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const passed = percentage >= 70; // 70% passing grade
    
    // Create result object
    const result = {
      id: Date.now().toString(),
      webinarId: webinar.id,
      webinarTitle: webinar.title,
      participantName: name,
      participantEmail: email,
      score,
      totalQuestions,
      percentage,
      passed,
      answers,
      confirmed: confirmed || false,
      completedAt: new Date().toISOString()
    };
    
    // Save result
    await resultsStorage.update(data => {
      if (!data.results) data.results = [];
      data.results.push(result);
      return data;
    });
    
    // Send emails
    try {
      await sendResultEmail(
        { name, email },
        webinar,
        result
      );
      
      await sendAdminNotification(
        { name, email },
        webinar,
        result
      );
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the request if email fails
    }
    
    logAudit('WEBINAR_COMPLETE', email, `Webinar abgeschlossen: ${webinar.title} (${score}/${totalQuestions})`);
    
    res.json({
      message: 'Ergebnis erfolgreich gespeichert',
      result: {
        score,
        totalQuestions,
        percentage,
        passed
      }
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Fehler beim Speichern des Ergebnisses' });
  }
});

module.exports = router;
