const fs = require('fs').promises;
const path = require('path');
const { spawnAsync } = require('../utils/process');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
const SLIDES_DIR = process.env.SLIDES_DIR || path.join(__dirname, '../../slides');

/**
 * Get common presentation CSS styles
 * Matches the main webinar site design for consistency
 */
function getCommonPresentationStyles() {
  return `
    /* Base styles matching main site */
    body {
      background: white;
      margin: 0;
      padding: 0;
    }
    
    .reveal {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: clamp(14px, 1.5vw, 18px);
      background: white;
      color: #333;
    }
    
    /* Headings matching main site style */
    .reveal h1 {
      color: #2c3e50;
      font-size: clamp(24px, 2.5vw, 32px);
      font-weight: 600;
      margin-bottom: 0.6em;
      line-height: 1.3;
    }
    
    .reveal h2 {
      color: #2c3e50;
      font-size: clamp(20px, 2vw, 26px);
      font-weight: 600;
      margin-bottom: 0.5em;
      line-height: 1.3;
    }
    
    .reveal h3 {
      color: #2c3e50;
      font-size: clamp(16px, 1.7vw, 22px);
      font-weight: 600;
      margin-bottom: 0.5em;
      line-height: 1.3;
    }
    
    /* Text content */
    .reveal p {
      font-size: clamp(14px, 1.5vw, 18px);
      line-height: 1.6;
      margin-bottom: 0.8em;
      color: #333;
    }
    
    .reveal ul, .reveal ol {
      margin-top: 0.5em;
      margin-bottom: 0.8em;
    }
    
    .reveal li {
      font-size: clamp(14px, 1.5vw, 18px);
      line-height: 1.6;
      margin-bottom: 0.5em;
      color: #333;
    }
    
    /* Links matching main site accent color */
    .reveal a {
      color: #3498db;
      text-decoration: none;
    }
    
    .reveal a:hover {
      color: #2980b9;
      text-decoration: underline;
    }
    
    /* Images responsive and clean */
    .reveal section img {
      border: none;
      box-shadow: none;
      background: none;
      max-width: 100%;
      max-height: 60vh;
      object-fit: contain;
      margin: 1em auto;
      display: block;
    }
    
    /* Slide container */
    .reveal .slides {
      width: 100%;
      height: 100%;
    }
    
    /* Individual slides with proper spacing and background */
    .reveal section {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 30px;
      box-sizing: border-box;
      overflow-y: auto;
      background: white;
      text-align: left;
    }
    
    /* Hide Reveal.js default controls and progress */
    .reveal .controls {
      display: none !important;
    }
    
    /* Image Sizing Classes */
    .reveal img.img-small {
      max-width: 25%;
      height: auto;
      display: inline-block;
    }
    .reveal img.img-medium {
      max-width: 50%;
      height: auto;
      display: inline-block;
    }
    .reveal img.img-large {
      max-width: 75%;
      height: auto;
      display: inline-block;
    }
    .reveal img.img-full {
      max-width: 100%;
      height: auto;
      display: block;
    }
    
    /* Image Float/Text Wrap Classes */
    .reveal img.img-float-left {
      float: left;
      margin: 0 15px 15px 0;
    }
    .reveal img.img-float-right {
      float: right;
      margin: 0 0 15px 15px;
    }
    
    /* Column Layout Support */
    .reveal .columns-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
      width: 100%;
    }
    .reveal .columns-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
      width: 100%;
    }
    .reveal .column {
      padding: 10px;
      border: 1px solid #ddd;
      min-height: 50px;
      background: #f9f9f9;
    }
    
    /* Table Styling */
    .reveal table {
      border-collapse: collapse;
      width: 100%;
      margin: 15px 0;
    }
    .reveal table td,
    .reveal table th {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    .reveal table th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    
    /* Responsive adjustments for columns */
    @media (max-width: 768px) {
      .reveal .columns-2,
      .reveal .columns-3 {
        grid-template-columns: 1fr;
      }
      .reveal img.img-float-left,
      .reveal img.img-float-right {
        float: none;
        margin: 10px auto;
        display: block;
      }
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
      progress: false,
      center: true,
      hash: false,
      transition: 'slide',
      backgroundTransition: 'none'
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
      progress: false,
      center: true,
      hash: false,
      transition: 'slide',
      backgroundTransition: 'none',
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
      progress: false,
      center: true,
      hash: false,
      transition: 'slide',
      backgroundTransition: 'none'
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
