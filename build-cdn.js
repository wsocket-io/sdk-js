// esbuild config for CDN / browser bundle (IIFE)
const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.resolve(__dirname, 'src/index.ts')],
  bundle: true,
  minify: true,
  sourcemap: true,
  format: 'iife',
  globalName: 'WSocketIO',
  platform: 'browser',
  target: ['es2020'],
  outfile: path.resolve(__dirname, 'dist/wsocket.min.js'),
  alias: {
    'ws': path.resolve(__dirname, 'src/ws-browser.ts'),
  },
  banner: {
    js: '/* @wsocket-io/sdk v0.2.0 | MIT License | https://wsocket.io */',
  },
}).then(() => {
  console.log('✓ CDN bundle built → dist/wsocket.min.js');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
