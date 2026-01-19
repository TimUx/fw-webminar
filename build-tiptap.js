const esbuild = require('esbuild');
const path = require('path');

// Build TipTap bundle
esbuild.build({
  entryPoints: [path.join(__dirname, 'tiptap-entry.js')],
  bundle: true,
  format: 'iife',
  globalName: 'TipTapBundle',
  outfile: path.join(__dirname, 'public/assets/lib/tiptap/tiptap-bundled.js'),
  platform: 'browser',
  target: ['es2020'],
  minify: false,
  sourcemap: true,
  footer: {
    js: 'window.TipTapBundle = TipTapBundle;'
  }
}).then(() => {
  console.log('✅ TipTap bundle created successfully');
}).catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
