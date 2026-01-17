const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const JSZip = require('jszip');
const pdfParse = require('pdf-parse');
const { spawnAsync } = require('../utils/process');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
const ASSETS_DIR = process.env.ASSETS_DIR || path.join(__dirname, '../../assets');
const PDF_TEXT_PREVIEW_LENGTH = 500; // Maximum characters to show in PDF text preview
const SSE_POLL_INTERVAL = 500; // Milliseconds between progress updates

/**
 * Progress tracking for slide analysis
 */
class AnalysisProgress {
  constructor() {
    this.sessions = new Map();
  }

  create(sessionId) {
    this.sessions.set(sessionId, {
      progress: 0,
      total: 100,
      status: 'starting',
      message: 'Analyse wird gestartet...',
      slides: [],
      error: null
    });
  }

  update(sessionId, data) {
    if (this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId);
      Object.assign(session, data);
      this.sessions.set(sessionId, session);
    }
  }

  get(sessionId) {
    return this.sessions.get(sessionId);
  }

  delete(sessionId) {
    this.sessions.delete(sessionId);
  }
}

const progressTracker = new AnalysisProgress();

/**
 * Extract text content from PPTX slide XML
 */
function extractTextFromSlideXML(xml) {
  const textMatches = xml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
  const texts = textMatches.map(match => {
    const text = match.replace(/<a:t>|<\/a:t>/g, '');
    return text;
  });
  return texts.join(' ').trim();
}

/**
 * Extract images from PPTX and save them
 */
async function extractImagesFromPPTX(zip, webinarId) {
  const images = [];
  const imageDir = path.join(UPLOADS_DIR, webinarId);
  
  // Create directory for images
  await fs.mkdir(imageDir, { recursive: true });
  
  // Find all image files in the PPTX
  const imageFiles = Object.keys(zip.files).filter(filename => 
    filename.startsWith('ppt/media/') && 
    /\.(png|jpg|jpeg|gif|svg)$/i.test(filename)
  );
  
  for (const filename of imageFiles) {
    const file = zip.files[filename];
    const imageData = await file.async('nodebuffer');
    const imageName = path.basename(filename);
    const imagePath = path.join(imageDir, imageName);
    
    await fs.writeFile(imagePath, imageData);
    
    images.push({
      originalPath: filename,
      filename: imageName,
      publicPath: `/uploads/${webinarId}/${imageName}`
    });
  }
  
  return images;
}

/**
 * Get image references from slide XML
 */
function getImageRefsFromSlideXML(xml) {
  const imageRefs = [];
  const blipMatches = xml.match(/r:embed="([^"]+)"/g) || [];
  
  blipMatches.forEach(match => {
    const refId = match.replace(/r:embed="|"/g, '');
    imageRefs.push(refId);
  });
  
  return imageRefs;
}

/**
 * Parse slide relationships to map image references
 */
async function parseSlideRelationships(zip, slideIndex) {
  const relsPath = `ppt/slides/_rels/slide${slideIndex}.xml.rels`;
  
  if (!zip.files[relsPath]) {
    return {};
  }
  
  const relsXml = await zip.files[relsPath].async('string');
  const relationships = {};
  
  const relMatches = relsXml.match(/<Relationship[^>]*>/g) || [];
  
  relMatches.forEach(match => {
    const idMatch = match.match(/Id="([^"]+)"/);
    const targetMatch = match.match(/Target="([^"]+)"/);
    
    if (idMatch && targetMatch) {
      const id = idMatch[1];
      // Replace all occurrences of '../' to prevent path traversal
      const target = targetMatch[1].replace(/\.\.\//g, 'ppt/');
      relationships[id] = target;
    }
  });
  
  return relationships;
}

/**
 * Analyze PPTX file and extract slides with content and images
 */
async function analyzePPTX(filename, webinarId, onProgress) {
  const filePath = path.join(UPLOADS_DIR, filename);
  const data = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(data);
  
  onProgress(10, 'PPTX-Datei geladen, analysiere Folien...');
  
  // Extract all images first
  const allImages = await extractImagesFromPPTX(zip, webinarId);
  onProgress(30, `${allImages.length} Bilder extrahiert...`);
  
  // Find all slide files
  const slideFiles = Object.keys(zip.files)
    .filter(filename => /^ppt\/slides\/slide\d+\.xml$/.test(filename))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)[1]);
      const numB = parseInt(b.match(/slide(\d+)/)[1]);
      return numA - numB;
    });
  
  onProgress(40, `${slideFiles.length} Folien gefunden...`);
  
  const slides = [];
  const progressPerSlide = 50 / slideFiles.length;
  
  for (let i = 0; i < slideFiles.length; i++) {
    const slideFile = slideFiles[i];
    const slideIndex = i + 1;
    const slideXml = await zip.files[slideFile].async('string');
    
    // Extract text content
    const text = extractTextFromSlideXML(slideXml);
    
    // Get image references for this slide
    const imageRefs = getImageRefsFromSlideXML(slideXml);
    const relationships = await parseSlideRelationships(zip, slideIndex);
    
    // Map image references to actual images
    const slideImages = imageRefs
      .map(refId => relationships[refId])
      .filter(target => target)
      .map(target => {
        const targetFilename = path.basename(target);
        return allImages.find(img => img.filename === targetFilename);
      })
      .filter(img => img);
    
    slides.push({
      title: `Folie ${slideIndex}`,
      content: formatSlideContent(text, slideImages),
      speakerNote: text,
      images: slideImages
    });
    
    onProgress(40 + (progressPerSlide * (i + 1)), `Folie ${slideIndex}/${slideFiles.length} verarbeitet...`);
  }
  
  onProgress(95, 'Analyse abgeschlossen...');
  
  return slides;
}

/**
 * Format slide content with text and images
 */
function formatSlideContent(text, images) {
  let content = '';
  
  // Add text content with basic formatting
  if (text) {
    const paragraphs = text.split(/\n+/).filter(p => p.trim());
    if (paragraphs.length > 0) {
      // First paragraph as heading if it's short
      if (paragraphs[0].length < 100) {
        content += `<h3>${escapeHtml(paragraphs[0])}</h3>\n`;
        paragraphs.shift();
      }
      // Rest as paragraphs
      paragraphs.forEach(p => {
        content += `<p>${escapeHtml(p)}</p>\n`;
      });
    }
  }
  
  // Add images
  if (images && images.length > 0) {
    images.forEach(img => {
      content += `<img src="${img.publicPath}" alt="Slide Image" style="max-width: 100%; height: auto; margin: 20px 0;">\n`;
    });
  }
  
  return content;
}

/**
 * Extract PDF pages as images using pdftoppm
 */
async function extractPDFImages(filename, webinarId) {
  const pdfPath = path.join(UPLOADS_DIR, filename);
  const imageDir = path.join(UPLOADS_DIR, webinarId);
  
  // Create directory for images
  await fs.mkdir(imageDir, { recursive: true });
  
  try {
    // Use pdftoppm to convert PDF pages to PNG images
    // Using spawn with separate arguments to prevent command injection
    const outputPrefix = path.join(imageDir, 'page');
    await spawnAsync('pdftoppm', [pdfPath, outputPrefix, '-png'], { timeout: 120000 });
    
    // Find generated images
    const files = await fs.readdir(imageDir);
    const imageFiles = files.filter(f => f.startsWith('page') && f.endsWith('.png')).sort();
    
    // Return image metadata
    return imageFiles.map((filename, index) => ({
      originalPath: `${imageDir}/${filename}`,
      filename: filename,
      publicPath: `/uploads/${webinarId}/${filename}`,
      pageNumber: index + 1
    }));
  } catch (error) {
    console.error('PDF image extraction error:', error);
    // Return empty array if extraction fails
    return [];
  }
}

/**
 * Analyze PDF file and extract pages with images
 */
async function analyzePDF(filename, webinarId, onProgress) {
  const filePath = path.join(UPLOADS_DIR, filename);
  const dataBuffer = await fs.readFile(filePath);
  
  onProgress(10, 'PDF-Datei geladen...');
  
  // Parse PDF for text content
  const pdfData = await pdfParse(dataBuffer);
  
  onProgress(30, `PDF analysiert: ${pdfData.numpages} Seiten gefunden...`);
  
  // Extract PDF pages as images
  const pdfImages = await extractPDFImages(filename, webinarId);
  
  onProgress(60, `${pdfImages.length} Seiten als Bilder extrahiert...`);
  
  // Split text by pages (approximation)
  const textPages = splitTextIntoPages(pdfData.text, pdfData.numpages);
  
  const slides = [];
  const progressPerPage = 30 / pdfData.numpages;
  
  for (let i = 0; i < pdfData.numpages; i++) {
    const pageText = textPages[i] || '';
    const pageImage = pdfImages.find(img => img.pageNumber === i + 1);
    
    // Build content with image if available
    let content = '';
    if (pageImage) {
      content = `<img src="${pageImage.publicPath}" alt="Seite ${i + 1}" style="max-width: 100%; height: auto;">`;
    } else {
      // Fallback to text preview if image extraction failed
      content = `<p>${escapeHtml(pageText.trim().substring(0, PDF_TEXT_PREVIEW_LENGTH))}</p>`;
      if (pdfImages.length === 0) {
        content += `<p><em>Hinweis: PDF-Bilder konnten nicht extrahiert werden. Bitte stellen Sie sicher, dass pdftoppm (poppler-utils) installiert ist.</em></p>`;
      }
    }
    
    slides.push({
      title: `Seite ${i + 1}`,
      content: content,
      speakerNote: pageText.trim(),
      images: pageImage ? [pageImage] : []
    });
    
    onProgress(60 + (progressPerPage * (i + 1)), `Seite ${i + 1}/${pdfData.numpages} verarbeitet...`);
  }
  
  onProgress(95, 'PDF-Analyse abgeschlossen...');
  
  return slides;
}

/**
 * Split PDF text into approximate pages
 */
function splitTextIntoPages(text, numPages) {
  if (!text || numPages === 0) return [];
  
  const lines = text.split('\n');
  const linesPerPage = Math.ceil(lines.length / numPages);
  const pages = [];
  
  for (let i = 0; i < numPages; i++) {
    const start = i * linesPerPage;
    const end = start + linesPerPage;
    pages.push(lines.slice(start, end).join('\n'));
  }
  
  return pages;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Main analysis function
 */
async function analyzePresentation(filename, webinarId, sessionId) {
  const isPDF = filename.toLowerCase().endsWith('.pdf');
  
  progressTracker.create(sessionId);
  
  try {
    const onProgress = (progress, message) => {
      progressTracker.update(sessionId, {
        progress: Math.round(progress),
        message,
        status: 'processing'
      });
    };
    
    let slides;
    
    if (isPDF) {
      slides = await analyzePDF(filename, webinarId, onProgress);
    } else {
      slides = await analyzePPTX(filename, webinarId, onProgress);
    }
    
    progressTracker.update(sessionId, {
      progress: 100,
      status: 'completed',
      message: 'Analyse erfolgreich abgeschlossen',
      slides
    });
    
    return slides;
  } catch (error) {
    console.error('Analysis error:', error);
    progressTracker.update(sessionId, {
      progress: 0,
      status: 'error',
      message: error.message,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  analyzePresentation,
  progressTracker,
  SSE_POLL_INTERVAL
};
