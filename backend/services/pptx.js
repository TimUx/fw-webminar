const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
const SLIDES_DIR = process.env.SLIDES_DIR || path.join(__dirname, '../../slides');

/**
 * Execute a command safely using spawn (avoids shell injection)
 */
function spawnAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, shell: false });
    let stdout = '';
    let stderr = '';
    
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }
    
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }
    
    child.on('error', reject);
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`Command failed with exit code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        error.code = code;
        reject(error);
      }
    });
    
    // Handle timeout
    if (options.timeout) {
      setTimeout(() => {
        child.kill();
        reject(new Error('Command timeout'));
      }, options.timeout);
    }
  });
}

/**
 * Get common presentation CSS styles
 */
function getCommonPresentationStyles() {
  return `
    .reveal {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 28px;
    }
    .reveal h1 {
      color: #2c3e50;
      font-size: 2em;
      margin-bottom: 0.5em;
    }
    .reveal h2 {
      color: #2c3e50;
      font-size: 1.5em;
      margin-bottom: 0.5em;
    }
    .reveal h3 {
      color: #2c3e50;
      font-size: 1.2em;
      margin-bottom: 0.5em;
    }
    .reveal p, .reveal li {
      font-size: 0.9em;
      line-height: 1.4;
      margin-bottom: 0.5em;
    }
    .reveal section img {
      border: none;
      box-shadow: none;
      background: none;
      max-width: 100%;
      max-height: 90vh;
      object-fit: contain;
    }
    /* Hide Reveal.js controls */
    .reveal .controls {
      display: none !important;
    }
  `;
}

/**
 * Convert PPTX or PDF to HTML using LibreOffice
 */
async function convertPPTXToHTML(pptxFilename, webinarId) {
  const pptxPath = path.join(UPLOADS_DIR, pptxFilename);
  const outputDir = path.join(SLIDES_DIR, webinarId);
  
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });
  
  // Determine file type
  const isPDF = pptxFilename.toLowerCase().endsWith('.pdf');
  const fileType = isPDF ? 'PDF' : 'PPTX';
  
  // Convert PPTX/PDF to HTML using LibreOffice
  // This assumes LibreOffice is available (via Docker or locally)
  try {
    // LibreOffice headless conversion
    // Using spawn with separate arguments to prevent command injection
    const { stdout, stderr } = await spawnAsync(
      'libreoffice',
      ['--headless', '--convert-to', 'html', '--outdir', outputDir, pptxPath],
      { timeout: 60000 }
    );
    
    console.log(`LibreOffice conversion output (${fileType}):`, stdout);
    if (stderr) console.error(`LibreOffice conversion stderr (${fileType}):`, stderr);
    
    // Find the generated HTML file
    const files = await fs.readdir(outputDir);
    const htmlFile = files.find(f => f.endsWith('.html'));
    
    if (!htmlFile) {
      throw new Error('HTML-Datei wurde nicht generiert');
    }
    
    return htmlFile;
  } catch (error) {
    console.error(`${fileType} conversion error:`, error);
    
    // Fallback: Create a simple placeholder if LibreOffice is not available
    console.log('LibreOffice nicht verfügbar. Erstelle Platzhalter-Slides...');
    await createPlaceholderSlides(pptxFilename, outputDir);
    
    return 'slides.html';
  }
}

/**
 * Convert PDF to images using ImageMagick/pdftoppm and create slides
 */
async function convertPDFToSlides(pdfFilename, webinarId) {
  const pdfPath = path.join(UPLOADS_DIR, pdfFilename);
  const outputDir = path.join(SLIDES_DIR, webinarId);
  
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });
  
  try {
    // Try using pdftoppm (from poppler-utils) to convert PDF to images
    // Using spawn with separate arguments to prevent command injection
    const outputPrefix = path.join(outputDir, 'slide');
    const { stdout, stderr } = await spawnAsync(
      'pdftoppm',
      [pdfPath, outputPrefix, '-png'],
      { timeout: 120000 }
    );
    
    console.log('PDF to images conversion output:', stdout);
    if (stderr) console.error('PDF to images conversion stderr:', stderr);
    
    // Find generated images
    const files = await fs.readdir(outputDir);
    const imageFiles = files.filter(f => f.startsWith('slide') && f.endsWith('.png')).sort();
    
    if (imageFiles.length === 0) {
      throw new Error('Keine Bilder aus PDF generiert');
    }
    
    // Create Reveal.js presentation with images
    return await createImageSlides(webinarId, imageFiles);
  } catch (error) {
    console.error('PDF to images conversion error:', error);
    
    // Fallback to LibreOffice conversion
    console.log('Versuche PDF-Konvertierung mit LibreOffice...');
    return await convertPPTXToHTML(pdfFilename, webinarId);
  }
}

/**
 * Create Reveal.js presentation from PDF images
 */
async function createImageSlides(webinarId, imageFiles) {
  const outputDir = path.join(SLIDES_DIR, webinarId);
  
  const slides = imageFiles.map((imgFile, index) => `
    <section>
      <img src="${imgFile}" alt="Slide ${index + 1}">
    </section>
  `).join('\n');
  
  const revealHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Webinar Präsentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/theme/white.css">
  <style>
    ${getCommonPresentationStyles()}
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slides}
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.js"></script>
  <script>
    Reveal.initialize({
      controls: false,
      progress: true,
      center: true,
      hash: false,
      transition: 'slide'
    });
    
    // No speaker notes for PDF slides
    const speakerNotes = ${JSON.stringify(imageFiles.map(() => ''))};
    
    window.revealControl = {
      next: () => Reveal.next(),
      prev: () => Reveal.prev(),
      getCurrentSlide: () => Reveal.getState().indexh,
      getTotalSlides: () => Reveal.getTotalSlides(),
      getSpeakerNote: (index) => speakerNotes[index] || ''
    };
  </script>
</body>
</html>
  `;
  
  await fs.writeFile(path.join(outputDir, 'presentation.html'), revealHtml, 'utf-8');
  
  return 'presentation.html';
}

/**
 * Create placeholder slides when LibreOffice is not available
 */
async function createPlaceholderSlides(filename, outputDir) {
  const fileType = filename.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PPTX';
  const slidesHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Slides</title>
</head>
<body>
  <div>
    <h1>Platzhalter-Präsentation</h1>
    <p>Die ${fileType}-Datei "${filename}" wurde hochgeladen, aber noch nicht konvertiert.</p>
    <p>Bitte konfigurieren Sie LibreOffice für die automatische Konvertierung.</p>
  </div>
</body>
</html>
  `;
  
  await fs.writeFile(path.join(outputDir, 'slides.html'), slidesHtml, 'utf-8');
}

/**
 * Extract slides from HTML and create Reveal.js presentation
 */
async function createRevealPresentation(htmlFilename, webinarId, speakerNotes = []) {
  const outputDir = path.join(SLIDES_DIR, webinarId);
  const htmlPath = path.join(outputDir, htmlFilename);
  
  // Read the converted HTML
  let htmlContent = '';
  try {
    htmlContent = await fs.readFile(htmlPath, 'utf-8');
  } catch (error) {
    console.error('Could not read HTML file:', error);
    htmlContent = '<div><h1>Fehler beim Laden der Slides</h1></div>';
  }
  
  // Create Reveal.js presentation
  const revealHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Webinar Präsentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/theme/white.css">
  <style>
    ${getCommonPresentationStyles()}
    .slide-content {
      padding: 20px;
      text-align: left;
    }
    .speaker-note {
      display: none;
    }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides" id="presentation-slides">
      <!-- Slides will be injected here -->
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.js"></script>
  <script>
    // Speaker notes data
    const speakerNotes = ${JSON.stringify(speakerNotes)};
    
    // Initialize Reveal.js
    Reveal.initialize({
      controls: false,
      progress: true,
      center: true,
      hash: false,
      transition: 'slide',
      autoSlide: 0, // Will be controlled by parent
      loop: false
    });
    
    // Expose functions for parent control
    window.revealControl = {
      next: () => Reveal.next(),
      prev: () => Reveal.prev(),
      getCurrentSlide: () => Reveal.getState().indexh,
      getTotalSlides: () => Reveal.getTotalSlides(),
      getSpeakerNote: (index) => speakerNotes[index] || ''
    };
  </script>
</body>
</html>
  `;
  
  // Write Reveal.js presentation
  const revealPath = path.join(outputDir, 'presentation.html');
  await fs.writeFile(revealPath, revealHtml, 'utf-8');
  
  // Also save the slide content separately
  await fs.writeFile(path.join(outputDir, 'content.html'), htmlContent, 'utf-8');
  
  return 'presentation.html';
}

/**
 * Generate simple slides from PPTX metadata
 */
async function generateSimpleSlides(webinarId, slideData) {
  const outputDir = path.join(SLIDES_DIR, webinarId);
  await fs.mkdir(outputDir, { recursive: true });
  
  const slides = slideData.map((slide, index) => `
    <section>
      <div class="slide-content">
        <h2>${slide.title || `Folie ${index + 1}`}</h2>
        ${slide.content ? `<div>${slide.content}</div>` : ''}
      </div>
      ${slide.speakerNote ? `<aside class="notes">${slide.speakerNote}</aside>` : ''}
    </section>
  `).join('\n');
  
  const revealHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Webinar Präsentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/theme/white.css">
  <style>
    ${getCommonPresentationStyles()}
    .slide-content {
      padding: 30px;
      text-align: left;
      max-width: 90%;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slides}
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.js"></script>
  <script>
    Reveal.initialize({
      controls: false,
      progress: true,
      center: true,
      hash: false,
      transition: 'slide'
    });
    
    // Speaker notes from data
    const speakerNotes = ${JSON.stringify(slideData.map(s => s.speakerNote || ''))};
    
    window.revealControl = {
      next: () => Reveal.next(),
      prev: () => Reveal.prev(),
      getCurrentSlide: () => Reveal.getState().indexh,
      getTotalSlides: () => Reveal.getTotalSlides(),
      getSpeakerNote: (index) => speakerNotes[index] || ''
    };
  </script>
</body>
</html>
  `;
  
  await fs.writeFile(path.join(outputDir, 'presentation.html'), revealHtml, 'utf-8');
  
  return 'presentation.html';
}

module.exports = {
  convertPPTXToHTML,
  convertPDFToSlides,
  createImageSlides,
  createRevealPresentation,
  generateSimpleSlides
};
