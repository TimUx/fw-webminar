const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { PDFParse } = require('pdf-parse');
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
 * Configuration for repetitive content detection
 */
const REPETITIVE_CONTENT_CONFIG = {
  // Minimum percentage of slides that must contain the text to be considered repetitive
  minOccurrencePercentage: 0.6, // 60% of slides
  // Minimum percentage for known pattern matches (lower threshold)
  minPatternOccurrencePercentage: 0.3, // 30% of slides
  // Minimum text length to be considered (ignore very short text like single characters)
  minTextLength: 3,
  // Maximum text length to be considered (ignore very long text that's unlikely to be header/footer)
  maxTextLength: 200,
  // Patterns that indicate repetitive content (case-insensitive)
  repetitivePatterns: [
    /^\d+$/, // Pure numbers (page numbers)
    /^page\s+\d+/i, // "Page 1", "Page 2", etc.
    /^seite\s+\d+/i, // "Seite 1", "Seite 2", etc. (German)
    /^\d+\s*\/\s*\d+$/, // "1/10", "2/10", etc.
    /©\s*\d{4}/, // Copyright with year
    /\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4}/, // Dates
  ]
};

/**
 * Detect repetitive text elements across slides
 * Returns a Set of text strings that appear frequently across slides
 */
function detectRepetitiveText(slides) {
  if (slides.length < 2) {
    return new Set();
  }

  // Extract all text segments from each slide
  const textOccurrences = new Map();
  
  slides.forEach(slide => {
    // Note: speakerNote contains the extracted raw text from the slide
    // This is where analyzePPTX and analyzePDF store the text content
    const text = slide.speakerNote || '';
    
    // Split into lines and individual text segments
    const segments = text
      .split(/[\n\r]+/)
      .map(line => line.trim())
      .filter(line => {
        return line.length >= REPETITIVE_CONTENT_CONFIG.minTextLength &&
               line.length <= REPETITIVE_CONTENT_CONFIG.maxTextLength;
      });
    
    // Track unique segments per slide to avoid counting duplicates within same slide
    const uniqueSegments = new Set(segments);
    
    uniqueSegments.forEach(segment => {
      if (!textOccurrences.has(segment)) {
        textOccurrences.set(segment, 0);
      }
      textOccurrences.set(segment, textOccurrences.get(segment) + 1);
    });
  });

  // Find text that appears in a significant percentage of slides
  const minOccurrences = Math.ceil(slides.length * REPETITIVE_CONTENT_CONFIG.minOccurrencePercentage);
  const repetitiveTexts = new Set();

  textOccurrences.forEach((count, text) => {
    if (count >= minOccurrences) {
      repetitiveTexts.add(text);
    } else {
      // Also check if text matches known repetitive patterns
      const matchesPattern = REPETITIVE_CONTENT_CONFIG.repetitivePatterns.some(
        pattern => pattern.test(text)
      );
      if (matchesPattern && count >= Math.ceil(slides.length * REPETITIVE_CONTENT_CONFIG.minPatternOccurrencePercentage)) {
        // Lower threshold for known patterns
        repetitiveTexts.add(text);
      }
    }
  });

  return repetitiveTexts;
}

/**
 * Detect repetitive images across slides
 * Returns a Set of image filenames that appear frequently across slides
 */
function detectRepetitiveImages(slides) {
  if (slides.length < 2) {
    return new Set();
  }

  const imageOccurrences = new Map();

  slides.forEach(slide => {
    if (slide.images && slide.images.length > 0) {
      const uniqueImages = new Set(slide.images.map(img => img.filename));
      
      uniqueImages.forEach(filename => {
        if (!imageOccurrences.has(filename)) {
          imageOccurrences.set(filename, 0);
        }
        imageOccurrences.set(filename, imageOccurrences.get(filename) + 1);
      });
    }
  });

  // Find images that appear in a significant percentage of slides
  const minOccurrences = Math.ceil(slides.length * REPETITIVE_CONTENT_CONFIG.minOccurrencePercentage);
  const repetitiveImages = new Set();

  imageOccurrences.forEach((count, filename) => {
    if (count >= minOccurrences) {
      repetitiveImages.add(filename);
    }
  });

  return repetitiveImages;
}

/**
 * Remove repetitive text from a text string
 */
function removeRepetitiveText(text, repetitiveTexts) {
  if (!text || repetitiveTexts.size === 0) {
    return text;
  }

  // Split text into lines
  let lines = text.split(/[\n\r]+/);
  
  // Filter out lines that match repetitive text
  lines = lines.filter(line => {
    const trimmedLine = line.trim();
    return !repetitiveTexts.has(trimmedLine);
  });

  return lines.join('\n').trim();
}

/**
 * Remove repetitive images from a slide's image array
 */
function removeRepetitiveImages(images, repetitiveImages) {
  if (!images || images.length === 0 || repetitiveImages.size === 0) {
    return images;
  }

  return images.filter(img => !repetitiveImages.has(img.filename));
}

/**
 * Apply repetitive content filtering to all slides
 * This function:
 * 1. Detects text and images that appear repeatedly across slides
 * 2. Removes these repetitive elements from each slide
 * 3. Regenerates the slide content without repetitive elements
 * 
 * Note: The speakerNote field contains the raw extracted text and is the source
 * for both detection and filtering. After filtering, formatSlideContent() is called
 * to regenerate the HTML content based on the filtered text and images.
 */
function filterRepetitiveContent(slides) {
  if (slides.length < 2) {
    return slides;
  }

  // Detect repetitive elements
  const repetitiveTexts = detectRepetitiveText(slides);
  const repetitiveImages = detectRepetitiveImages(slides);

  console.log(`Detected ${repetitiveTexts.size} repetitive text elements`);
  console.log(`Detected ${repetitiveImages.size} repetitive images`);

  // Filter each slide
  return slides.map(slide => {
    const filteredSlide = { ...slide };

    // Filter repetitive text from speaker notes
    if (slide.speakerNote) {
      filteredSlide.speakerNote = removeRepetitiveText(slide.speakerNote, repetitiveTexts);
    }

    // Filter repetitive images
    if (slide.images && slide.images.length > 0) {
      filteredSlide.images = removeRepetitiveImages(slide.images, repetitiveImages);
    }

    // Regenerate content based on filtered data
    const text = filteredSlide.speakerNote || '';
    filteredSlide.content = formatSlideContentAsJSON(text, filteredSlide.images);

    return filteredSlide;
  });
}

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
      content: formatSlideContentAsJSON(text, slideImages),
      speakerNote: text,
      images: slideImages
    });
    
    onProgress(40 + (progressPerSlide * (i + 1)), `Folie ${slideIndex}/${slideFiles.length} verarbeitet...`);
  }
  
  onProgress(90, 'Entferne wiederkehrende Inhalte...');
  
  // Filter out repetitive content (headers, footers, logos, etc.)
  const filteredSlides = filterRepetitiveContent(slides);
  
  onProgress(95, 'Analyse abgeschlossen...');
  
  return filteredSlides;
}

/**
 * Format slide content with text and images
 */
/**
 * Format slide content as TipTap JSON instead of HTML
 * This ensures imported PPTX/PDF content uses the same storage format as manually created slides
 */
function formatSlideContentAsJSON(text, images) {
  const content = [];
  
  // Add text content as TipTap nodes
  if (text) {
    const paragraphs = text.split(/\n+/).filter(p => p.trim());
    if (paragraphs.length > 0) {
      // First paragraph as heading if it's short
      if (paragraphs[0].length < 100) {
        content.push({
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: paragraphs[0] }]
        });
        paragraphs.shift();
      }
      
      // Rest as paragraphs
      paragraphs.forEach(p => {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text: p }]
        });
      });
    }
  }
  
  // Add images
  if (images && images.length > 0) {
    images.forEach(img => {
      content.push({
        type: 'image',
        attrs: {
          src: img.publicPath,
          alt: 'Slide Image',
          class: 'img-medium'
        }
      });
    });
  }
  
  // Return as TipTap JSON document
  return {
    type: 'doc',
    content: content
  };
}

/**
 * Legacy function for backward compatibility
 * Generates HTML from text and images
 * DEPRECATED: Use formatSlideContentAsJSON() for new implementations
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
  
  // Parse PDF for text content using PDFParse v2 API
  const parser = new PDFParse({ data: dataBuffer });
  const textResult = await parser.getText();
  const pdfData = {
    numpages: textResult.total,
    text: textResult.text
  };
  
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
    
    // Build content as TipTap JSON with image if available
    let content;
    if (pageImage) {
      // Create TipTap JSON with image
      content = {
        type: 'doc',
        content: [
          {
            type: 'image',
            attrs: {
              src: pageImage.publicPath,
              alt: `Seite ${i + 1}`,
              class: 'img-medium'
            }
          }
        ]
      };
    } else {
      // Fallback to text preview if image extraction failed
      const textPreview = pageText.trim().substring(0, PDF_TEXT_PREVIEW_LENGTH);
      content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: textPreview }]
          }
        ]
      };
      
      if (pdfImages.length === 0) {
        // Add note about missing images
        content.content.push({
          type: 'paragraph',
          content: [{
            type: 'text',
            marks: [{ type: 'italic' }],
            text: 'Hinweis: PDF-Bilder konnten nicht extrahiert werden. Bitte stellen Sie sicher, dass pdftoppm (poppler-utils) installiert ist.'
          }]
        });
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
  
  onProgress(90, 'Entferne wiederkehrende Inhalte...');
  
  // Filter out repetitive content (headers, footers, page numbers, etc.)
  const filteredSlides = filterRepetitiveContent(slides);
  
  onProgress(95, 'PDF-Analyse abgeschlossen...');
  
  return filteredSlides;
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
