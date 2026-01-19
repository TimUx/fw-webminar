/**
 * Reveal.js Slide Renderer
 * Converts TipTap JSON to Reveal.js HTML slides using generateHTML
 */

const { generateHTML } = require('@tiptap/html');
const StarterKit = require('@tiptap/starter-kit').default;
const Image = require('@tiptap/extension-image').default;
const Link = require('@tiptap/extension-link').default;
const Table = require('@tiptap/extension-table').default;
const TableRow = require('@tiptap/extension-table-row').default;
const TableCell = require('@tiptap/extension-table-cell').default;
const TableHeader = require('@tiptap/extension-table-header').default;
const TextAlign = require('@tiptap/extension-text-align').default;
const Underline = require('@tiptap/extension-underline').default;
const Color = require('@tiptap/extension-color').default;
const TextStyle = require('@tiptap/extension-text-style').default;
const { Node } = require('@tiptap/core');

// Define custom nodes (matching frontend definitions)
const Column = Node.create({
  name: 'column',
  content: 'block+',
  group: 'block',
  
  parseHTML() {
    return [{ tag: 'div.column' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'column' }, 0];
  },
});

const TwoColumnBlock = Node.create({
  name: 'twoColumnBlock',
  group: 'block',
  content: 'column column',
  draggable: true,
  
  parseHTML() {
    return [{ tag: 'div.two-column-block' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'two-column-block', 'data-type': 'two-column-block' }, 0];
  },
});

const ThreeColumnBlock = Node.create({
  name: 'threeColumnBlock',
  group: 'block',
  content: 'column column column',
  draggable: true,
  
  parseHTML() {
    return [{ tag: 'div.three-column-block' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'three-column-block', 'data-type': 'three-column-block' }, 0];
  },
});

const HeroTitle = Node.create({
  name: 'heroTitle',
  content: 'text*',
  
  parseHTML() {
    return [{ tag: 'h1.hero-title' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['h1', { class: 'hero-title' }, 0];
  },
});

const HeroSubtitle = Node.create({
  name: 'heroSubtitle',
  content: 'text*',
  
  parseHTML() {
    return [{ tag: 'p.hero-subtitle' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['p', { class: 'hero-subtitle' }, 0];
  },
});

const HeroBlock = Node.create({
  name: 'heroBlock',
  group: 'block',
  content: 'heroTitle heroSubtitle',
  draggable: true,
  
  parseHTML() {
    return [{ tag: 'div.hero-block' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'hero-block', 'data-type': 'hero-block' }, 0];
  },
});

// TipTap extensions configuration (for server-side rendering)
const extensions = [
  StarterKit.configure({
    heading: {
      levels: [2, 3, 4, 5]
    }
  }),
  Image.configure({
    HTMLAttributes: {
      class: 'tiptap-image'
    }
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      target: '_blank',
      rel: 'noopener noreferrer'
    }
  }),
  Table.configure({
    resizable: true,
    HTMLAttributes: {
      class: 'tiptap-table'
    }
  }),
  TableRow,
  TableCell,
  TableHeader,
  TextAlign.configure({
    types: ['heading', 'paragraph']
  }),
  Underline,
  TextStyle,
  Color,
  // Custom layout nodes
  Column,
  TwoColumnBlock,
  ThreeColumnBlock,
  HeroTitle,
  HeroSubtitle,
  HeroBlock
];

/**
 * Convert TipTap JSON to HTML string
 * @param {Object} content - TipTap JSON content
 * @returns {string} HTML string
 */
function tiptapJsonToHtml(content) {
  try {
    // Generate HTML from TipTap JSON
    return generateHTML(content, extensions);
  } catch (error) {
    console.error('Error converting content to HTML:', error);
    // Return more helpful error message with details
    return `<p class="error">Fehler beim Rendern des Inhalts: ${error.message}</p>`;
  }
}

/**
 * Generate Reveal.js slide HTML from slide data
 * @param {Object} slide - Slide object with title, content (TipTap JSON), speakerNote
 * @returns {string} Reveal.js <section> HTML
 */
function generateSlideHtml(slide) {
  const title = slide.title || '';
  let content = '';
  
  // Convert content from TipTap JSON to HTML
  if (slide.content) {
    content = tiptapJsonToHtml(slide.content);
  }
  
  const speakerNote = slide.speakerNote || '';
  
  return `
    <section>
      <div class="slide-content">
        ${title ? `<h2>${escapeHtml(title)}</h2>` : ''}
        ${content}
      </div>
      ${speakerNote ? `<aside class="notes">${escapeHtml(speakerNote)}</aside>` : ''}
    </section>
  `;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Generate complete Reveal.js presentation HTML
 * @param {Array} slides - Array of slide objects
 * @param {string} title - Presentation title
 * @returns {string} Complete HTML document
 */
function generatePresentationHtml(slides, title = 'Webinar') {
  const slidesHtml = slides.map(slide => generateSlideHtml(slide)).join('\n');
  
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  
  <!-- Reveal.js CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/theme/white.css">
  
  <!-- Highlight.js for code syntax highlighting -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/plugin/highlight/monokai.css">
  
  <style>
    /* Custom styles for TipTap content in Reveal.js */
    .reveal .slide-content {
      text-align: left;
    }
    
    /* Column layouts */
    .reveal .two-column-block,
    .reveal .columns-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }
    
    .reveal .three-column-block,
    .reveal .columns-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }
    
    .reveal .column {
      padding: 10px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }
    
    /* Hero block */
    .reveal .hero-block {
      text-align: center;
      padding: 60px 40px;
      margin: 30px 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      color: white;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    
    .reveal .hero-title {
      font-size: 2.5em;
      font-weight: bold;
      margin: 0 0 20px 0;
      line-height: 1.2;
    }
    
    .reveal .hero-subtitle {
      font-size: 1.3em;
      margin: 0;
      opacity: 0.95;
    }
    
    /* Images */
    .reveal img.img-small {
      max-width: 25%;
      height: auto;
    }
    
    .reveal img.img-medium {
      max-width: 50%;
      height: auto;
    }
    
    .reveal img.img-large {
      max-width: 75%;
      height: auto;
    }
    
    .reveal img.img-full {
      max-width: 100%;
      height: auto;
    }
    
    .reveal img.img-float-left {
      float: left;
      margin: 0 20px 20px 0;
    }
    
    .reveal img.img-float-right {
      float: right;
      margin: 0 0 20px 20px;
    }
    
    /* Tables */
    .reveal .tiptap-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .reveal .tiptap-table th,
    .reveal .tiptap-table td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    
    .reveal .tiptap-table th {
      background-color: #3498db;
      color: white;
      font-weight: bold;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .reveal .two-column-block,
      .reveal .three-column-block,
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
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slidesHtml}
    </div>
  </div>
  
  <!-- Reveal.js JavaScript -->
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/plugin/notes/notes.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/plugin/highlight/highlight.js"></script>
  
  <script>
    // Initialize Reveal.js
    Reveal.initialize({
      hash: true,
      slideNumber: true,
      showSlideNumber: 'all',
      center: true,
      transition: 'slide',
      plugins: [ RevealNotes, RevealHighlight ]
    });
  </script>
</body>
</html>`;
}

module.exports = {
  tiptapJsonToHtml,
  generateSlideHtml,
  generatePresentationHtml
};
