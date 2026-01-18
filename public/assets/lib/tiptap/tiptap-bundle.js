/**
 * TipTap Editor Bundle
 * Self-contained TipTap editor setup for fw-webminar
 * Uses CDN imports for all TipTap dependencies
 */

// Import statements will be handled by browser ES modules
// This file provides a wrapper for easy initialization

/**
 * Initialize TipTap editor with all necessary extensions
 * @param {HTMLElement} element - The DOM element to mount the editor
 * @param {string} initialContent - Initial HTML content
 * @param {Function} onUpdate - Callback when content changes
 * @returns {Object} Editor instance with helper methods
 */
window.createTipTapEditor = async function(element, initialContent = '', onUpdate = null) {
  // Import TipTap modules from CDN
  const { Editor } = await import('https://esm.sh/@tiptap/core@2.1.13');
  const StarterKit = (await import('https://esm.sh/@tiptap/starter-kit@2.1.13')).default;
  const Image = (await import('https://esm.sh/@tiptap/extension-image@2.1.13')).default;
  const Link = (await import('https://esm.sh/@tiptap/extension-link@2.1.13')).default;
  const Table = (await import('https://esm.sh/@tiptap/extension-table@2.1.13')).default;
  const TableRow = (await import('https://esm.sh/@tiptap/extension-table-row@2.1.13')).default;
  const TableCell = (await import('https://esm.sh/@tiptap/extension-table-cell@2.1.13')).default;
  const TableHeader = (await import('https://esm.sh/@tiptap/extension-table-header@2.1.13')).default;
  const TextAlign = (await import('https://esm.sh/@tiptap/extension-text-align@2.1.13')).default;
  const Underline = (await import('https://esm.sh/@tiptap/extension-underline@2.1.13')).default;
  const Color = (await import('https://esm.sh/@tiptap/extension-color@2.1.13')).default;
  const TextStyle = (await import('https://esm.sh/@tiptap/extension-text-style@2.1.13')).default;

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
      <button type="button" data-action="image" title="Bild" class="tiptap-btn">🖼️</button>
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
      <button type="button" data-action="columns-2" title="2 Spalten" class="tiptap-btn">⬜⬜</button>
      <button type="button" data-action="columns-3" title="3 Spalten" class="tiptap-btn">⬜⬜⬜</button>
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
      Color
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getHTML());
      }
      // Update hidden textarea if it exists
      if (element.tagName === 'TEXTAREA') {
        element.value = editor.getHTML();
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
      case 'columns-2':
        insertColumns(editor, 2);
        break;
      case 'columns-3':
        insertColumns(editor, 3);
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
  
  function insertColumns(editor, numCols) {
    const columns = Array.from({ length: numCols }, (_, i) => 
      `<div class="column"><p>Spalte ${i + 1}</p></div>`
    ).join('');
    
    const html = `<div class="columns-${numCols}">${columns}</div>`;
    
    editor.chain().focus().insertContent(html).run();
    
    if (window.showNotification) {
      window.showNotification(`${numCols}-Spalten Layout eingefügt`);
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
