/**
 * Custom TipTap Nodes for Layout Blocks
 * Implements TwoColumnBlock, ThreeColumnBlock, and HeroBlock as custom nodes
 */

/**
 * TwoColumnBlock - Side-by-side two-column layout
 */
export function createTwoColumnBlock() {
  return {
    name: 'twoColumnBlock',
    group: 'block',
    content: 'column column',
    draggable: true,
    
    parseHTML() {
      return [
        {
          tag: 'div.two-column-block',
        },
      ];
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
  };
}

/**
 * ThreeColumnBlock - Three-column layout
 */
export function createThreeColumnBlock() {
  return {
    name: 'threeColumnBlock',
    group: 'block',
    content: 'column column column',
    draggable: true,
    
    parseHTML() {
      return [
        {
          tag: 'div.three-column-block',
        },
      ];
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
  };
}

/**
 * HeroBlock - Large title with subtitle for hero slides
 */
export function createHeroBlock() {
  return {
    name: 'heroBlock',
    group: 'block',
    content: 'heroTitle heroSubtitle',
    draggable: true,
    
    parseHTML() {
      return [
        {
          tag: 'div.hero-block',
        },
      ];
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
  };
}

/**
 * Column - Container for column content (used by column blocks)
 */
export function createColumn() {
  return {
    name: 'column',
    content: 'block+',
    
    parseHTML() {
      return [
        {
          tag: 'div.column',
        },
      ];
    },
    
    renderHTML({ HTMLAttributes }) {
      return ['div', { class: 'column' }, 0];
    },
  };
}

/**
 * HeroTitle - Title element for hero blocks
 */
export function createHeroTitle() {
  return {
    name: 'heroTitle',
    content: 'text*',
    
    parseHTML() {
      return [
        {
          tag: 'h1.hero-title',
        },
      ];
    },
    
    renderHTML({ HTMLAttributes }) {
      return ['h1', { class: 'hero-title' }, 0];
    },
  };
}

/**
 * HeroSubtitle - Subtitle element for hero blocks
 */
export function createHeroSubtitle() {
  return {
    name: 'heroSubtitle',
    content: 'text*',
    
    parseHTML() {
      return [
        {
          tag: 'p.hero-subtitle',
        },
      ];
    },
    
    renderHTML({ HTMLAttributes }) {
      return ['p', { class: 'hero-subtitle' }, 0];
    },
  };
}
