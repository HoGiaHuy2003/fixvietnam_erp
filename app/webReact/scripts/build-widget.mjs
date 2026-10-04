import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const reactRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = resolve(reactRoot, '../..');
// Gradle's Kotlin/JS toolchain already installs a normal Webpack 5 in build/js.
// Reuse it instead of adding a second bundler or relying on Next's private Webpack wrapper.
const webpack = require(join(projectRoot, 'build', 'js', 'node_modules', 'webpack'));
const output = resolve(process.argv[2] ?? join(reactRoot, 'public', 'compose', 'js', 'quantity-widget.js'));

await mkdir(dirname(output), { recursive: true });

await new Promise((resolveBuild, rejectBuild) => {
  webpack({
    mode: 'production',
    target: 'web',
    context: reactRoot,
    entry: join(reactRoot, 'widget', 'quantity-widget.js'),
    output: { path: dirname(output), filename: output.split(/[\\/]/).at(-1), clean: false },
    optimization: { splitChunks: false, runtimeChunk: false },
    devtool: false,
  }, (error, stats) => {
    if (error) return rejectBuild(error);
    if (!stats || stats.hasErrors()) {
      return rejectBuild(new Error(stats?.toString({ all: false, errors: true }) ?? 'Widget bundle failed'));
    }
    resolveBuild();
  });
});

process.stdout.write(`React quantity widget: ${output}\n`);
