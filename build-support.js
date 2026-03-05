// esbuild config for Support Widget CDN bundle
const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.resolve(__dirname, 'src/support/embed.ts')],
  bundle: true,
  minify: true,
  sourcemap: true,
  format: 'iife',
  globalName: 'WSocketSupport',
  platform: 'browser',
  target: ['es2020'],
  outfile: path.resolve(__dirname, 'dist/support.min.js'),
  banner: {
    js: '/* wSocket Support Widget v0.1.0 | MIT License | https://wsocket.io */',
  },
}).then(() => {
  console.log('✓ Support widget built → dist/support.min.js');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
