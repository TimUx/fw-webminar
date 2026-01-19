/**
 * TipTap Editor Bundle
 * Self-contained TipTap editor setup for fw-webminar
 * Uses bundled TipTap dependencies
 * Includes custom nodes for layout blocks (TwoColumnBlock, ThreeColumnBlock, HeroBlock)
 */

/**
 * Initialize TipTap editor with all necessary extensions
 * @param {HTMLElement} element - The DOM element to mount the editor
 * @param {string} initialContent - Initial HTML content or JSON
 * @param {Function} onUpdate - Callback when content changes (receives JSON, not HTML)
 * @returns {Object} Editor instance with helper methods
 */
window.createTipTapEditor = async function(element, initialContent = '', onUpdate = null) {
  // Wait for bundled TipTap to be available
  if (!window.TipTapBundle) {
    throw new Error('TipTap bundle not loaded. Make sure tiptap-bundled.js is included before this script.');
  }
  
  // Get TipTap modules from bundled file
  const { Editor, Node, StarterKit, Image, Link, Table, TableRow, TableCell, TableHeader, TextAlign, Underline, Color, TextStyle } = window.TipTapBundle;
  
  // Define custom nodes for layout blocks
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
    
    addCommands() {
      return {
        insertTwoColumnBlock: () => ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            content: [
              {
                type: 'column',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Linke Spalte' }] }]
              },
              {
                type: 'column',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rechte Spalte' }] }]
              }
            ]
          });
        },
      };
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
    
    addCommands() {
      return {
        insertThreeColumnBlock: () => ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            content: [
              {
                type: 'column',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Spalte 1' }] }]
              },
              {
                type: 'column',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Spalte 2' }] }]
              },
              {
                type: 'column',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Spalte 3' }] }]
              }
            ]
          });
        },
      };
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
    
    addCommands() {
      return {
        insertHeroBlock: () => ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            content: [
              {
                type: 'heroTitle',
                content: [{ type: 'text', text: 'Großer Titel' }]
              },
              {
                type: 'heroSubtitle',
                content: [{ type: 'text', text: 'Untertitel oder Beschreibung' }]
              }
            ]
          });
        },
      };
    },
  });

  // Create editor container
  const editorContainer = document.createElement('div');
  editorContainer.className = 'tiptap-editor-wrapper';
  
  // Create toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'tiptap-toolbar';
  toolbar.innerHTML = `
    <div class="tiptap-toolbar-group">
      <button type="button" data-action="heading-2" title="Überschrift 2" class="tiptap-btn">H2</button>
      <button type="button" data-action="heading-3" title="Überschrift 3" class="tiptap-btn">H3</button>
      <button type="button" data-action="heading-4" title="Überschrift 4" class="tiptap-btn">H4</button>
    </div>
    <div class="tiptap-toolbar-group">
      <button type="button" data-action="bold" title="Fett" class="tiptap-btn"><strong>B</strong></button>
      <button type="button" data-action="italic" title="Kursiv" class="tiptap-btn"><em>I</em></button>
      <button type="button" data-action="underline" title="Unterstrichen" class="tiptap-btn"><u>U</u></button>
      <button type="button" data-action="strike" title="Durchgestrichen" class="tiptap-btn"><s>S</s></button>
    </div>
    <div class="tiptap-toolbar-group">
      <button type="button" data-action="bullet-list" title="Aufzählung" class="tiptap-btn">•</button>
      <button type="button" data-action="ordered-list" title="Nummerierung" class="tiptap-btn">1.</button>
    </div>
    <div class="tiptap-toolbar-group">
      <button type="button" data-action="align-left" title="Linksbündig" class="tiptap-btn">◀</button>
      <button type="button" data-action="align-center" title="Zentriert" class="tiptap-btn">▬</button>
      <button type="button" data-action="align-right" title="Rechtsbündig" class="tiptap-btn">▶</button>
    </div>
    <div class="tiptap-toolbar-group">
      <button type="button" data-action="link" title="Link" class="tiptap-btn">🔗</button>
      <button type="button" data-action="image" title="Bild Upload" class="tiptap-btn">🖼️</button>
      <button type="button" data-action="table" title="Tabelle" class="tiptap-btn">📊</button>
    </div>
    <div class="tiptap-toolbar-group tiptap-image-controls" style="display: none;">
      <span class="tiptap-label">Bildgröße:</span>
      <button type="button" data-action="img-small" title="Klein (25%)" class="tiptap-btn">S</button>
      <button type="button" data-action="img-medium" title="Mittel (50%)" class="tiptap-btn">M</button>
      <button type="button" data-action="img-large" title="Groß (75%)" class="tiptap-btn">L</button>
      <button type="button" data-action="img-full" title="Vollbild (100%)" class="tiptap-btn">XL</button>
    </div>
    <div class="tiptap-toolbar-group tiptap-image-controls" style="display: none;">
      <span class="tiptap-label">Position:</span>
      <button type="button" data-action="img-float-left" title="Links" class="tiptap-btn">◀️</button>
      <button type="button" data-action="img-float-right" title="Rechts" class="tiptap-btn">▶️</button>
      <button type="button" data-action="img-float-none" title="Normal" class="tiptap-btn">⬛</button>
    </div>
    <div class="tiptap-toolbar-group">
      <span class="tiptap-label">Layouts:</span>
      <button type="button" data-action="two-column-block" title="2-Spalten Layout" class="tiptap-btn">⬜⬜</button>
      <button type="button" data-action="three-column-block" title="3-Spalten Layout" class="tiptap-btn">⬜⬜⬜</button>
      <button type="button" data-action="hero-block" title="Hero Slide (Großer Titel)" class="tiptap-btn">🎯</button>
    </div>
  `;
  
  // Create editor element
  const editorElement = document.createElement('div');
  editorElement.className = 'tiptap-editor';
  
  // Append to container
  editorContainer.appendChild(toolbar);
  editorContainer.appendChild(editorElement);
  
  // Replace target element
  element.parentNode.insertBefore(editorContainer, element);
  element.style.display = 'none';
  
  // Initialize TipTap editor
  const editor = new Editor({
    element: editorElement,
    extensions: [
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
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        // Pass JSON instead of HTML for proper storage
        onUpdate(editor.getJSON());
      }
      // Update hidden textarea if it exists
      if (element.tagName === 'TEXTAREA') {
        // Store JSON as string in textarea
        element.value = JSON.stringify(editor.getJSON());
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content'
      }
    }
  });
  
  // Track selected image
  let selectedImage = null;
  
  // Handle image selection
  editorElement.addEventListener('click', (e) => {
    const imageControls = toolbar.querySelectorAll('.tiptap-image-controls');
    
    if (e.target.tagName === 'IMG') {
      // Deselect previous image
      if (selectedImage && selectedImage !== e.target) {
        selectedImage.classList.remove('tiptap-image-selected');
      }
      
      // Select new image
      selectedImage = e.target;
      selectedImage.classList.add('tiptap-image-selected');
      
      // Show image controls
      imageControls.forEach(group => group.style.display = '');
    } else {
      // Clicked outside image
      if (selectedImage) {
        selectedImage.classList.remove('tiptap-image-selected');
        selectedImage = null;
      }
      // Hide image controls
      imageControls.forEach(group => group.style.display = 'none');
    }
  });
  
  // Toolbar event handlers
  toolbar.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    
    e.preventDefault();
    const action = button.dataset.action;
    
    // Handle different actions
    switch(action) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        editor.chain().focus().toggleUnderline().run();
        break;
      case 'strike':
        editor.chain().focus().toggleStrike().run();
        break;
      case 'heading-2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'heading-3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'heading-4':
        editor.chain().focus().toggleHeading({ level: 4 }).run();
        break;
      case 'bullet-list':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'ordered-list':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'align-left':
        editor.chain().focus().setTextAlign('left').run();
        break;
      case 'align-center':
        editor.chain().focus().setTextAlign('center').run();
        break;
      case 'align-right':
        editor.chain().focus().setTextAlign('right').run();
        break;
      case 'link':
        handleLink(editor);
        break;
      case 'image':
        handleImageUpload(editor);
        break;
      case 'table':
        handleTableInsert(editor);
        break;
      case 'img-small':
        setImageSize(selectedImage, 'img-small');
        break;
      case 'img-medium':
        setImageSize(selectedImage, 'img-medium');
        break;
      case 'img-large':
        setImageSize(selectedImage, 'img-large');
        break;
      case 'img-full':
        setImageSize(selectedImage, 'img-full');
        break;
      case 'img-float-left':
        setImageFloat(selectedImage, 'img-float-left');
        break;
      case 'img-float-right':
        setImageFloat(selectedImage, 'img-float-right');
        break;
      case 'img-float-none':
        setImageFloat(selectedImage, null);
        break;
      case 'two-column-block':
        editor.chain().focus().insertTwoColumnBlock().run();
        if (window.showNotification) {
          window.showNotification('2-Spalten Layout eingefügt');
        }
        break;
      case 'three-column-block':
        editor.chain().focus().insertThreeColumnBlock().run();
        if (window.showNotification) {
          window.showNotification('3-Spalten Layout eingefügt');
        }
        break;
      case 'hero-block':
        editor.chain().focus().insertHeroBlock().run();
        if (window.showNotification) {
          window.showNotification('Hero Slide eingefügt');
        }
        break;
    }
  });
  
  // Helper functions
  function handleLink(editor) {
    const url = prompt('URL eingeben:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }
  
  function handleImageUpload(editor) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Bild ist zu groß. Maximale Größe: 5MB');
        return;
      }
      
      try {
        // Upload image to server
        const formData = new FormData();
        formData.append('image', file);
        
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/slides/upload-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Upload fehlgeschlagen');
        }
        
        const data = await response.json();
        
        // Insert image into editor
        editor.chain().focus().setImage({ src: data.url, class: 'img-medium' }).run();
        
        // Apply default size after a short delay
        setTimeout(() => {
          const images = editorElement.querySelectorAll('img:not(.img-small):not(.img-medium):not(.img-large):not(.img-full)');
          images.forEach(img => {
            if (img.src === data.url) {
              img.classList.add('img-medium');
            }
          });
        }, 100);
        
        if (window.showNotification) {
          window.showNotification('Bild erfolgreich hochgeladen');
        }
      } catch (error) {
        console.error('Image upload error:', error);
        if (window.showNotification) {
          window.showNotification('Fehler beim Hochladen des Bildes: ' + error.message, true);
        }
      }
    };
    
    input.click();
  }
  
  function handleTableInsert(editor) {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }
  
  function setImageSize(img, className) {
    if (!img) {
      if (window.showNotification) {
        window.showNotification('Bitte wählen Sie zuerst ein Bild aus', true);
      }
      return;
    }
    
    // Remove all size classes
    img.classList.remove('img-small', 'img-medium', 'img-large', 'img-full');
    // Add new size class
    img.classList.add(className);
    
    const sizeNames = {
      'img-small': 'Klein (25%)',
      'img-medium': 'Mittel (50%)',
      'img-large': 'Groß (75%)',
      'img-full': 'Vollbild (100%)'
    };
    
    if (window.showNotification) {
      window.showNotification(`Bildgröße geändert: ${sizeNames[className]}`);
    }
  }
  
  function setImageFloat(img, className) {
    if (!img) {
      if (window.showNotification) {
        window.showNotification('Bitte wählen Sie zuerst ein Bild aus', true);
      }
      return;
    }
    
    // Remove all float classes
    img.classList.remove('img-float-left', 'img-float-right');
    
    // Add new float class if specified
    if (className) {
      img.classList.add(className);
      
      const floatNames = {
        'img-float-left': 'Links',
        'img-float-right': 'Rechts'
      };
      
      if (window.showNotification) {
        window.showNotification(`Bildposition geändert: ${floatNames[className]}`);
      }
    } else {
      if (window.showNotification) {
        window.showNotification('Textumfluss entfernt');
      }
    }
  }
  
  // Return editor instance with helper methods
  return {
    editor: editor,
    getHTML: () => editor.getHTML(),
    getJSON: () => editor.getJSON(),
    setContent: (content) => editor.commands.setContent(content),
    destroy: () => {
      editor.destroy();
      editorContainer.remove();
      element.style.display = '';
    }
  };
};
