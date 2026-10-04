import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(projectRoot, 'app', 'webReact', 'out');

test('public catalog contains indexable, semantic content before JavaScript runs', async () => {
  const html = await readFile(join(outputRoot, 'catalog', 'index.html'), 'utf8');
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.match(markup, /<html[^>]*lang="vi"/);
  assert.match(markup, /<title>Danh mục sản phẩm/);
  assert.match(markup, /<meta name="description"/);
  assert.match(markup, /<h1[^>]*>Danh mục sản phẩm<\/h1>/);
  assert.match(markup, /<label[^>]*for="catalog-query"/);
  assert.match(markup, /<caption>Danh sách sản phẩm mẫu<\/caption>/);
  for (const sku of ['SP-001', 'SP-002', 'SP-003']) assert.ok(markup.includes(sku));
  assert.doesNotMatch(markup, /<iframe\b/);
  assert.doesNotMatch(markup, /<meta name="robots" content="[^"]*noindex/);
});

test('workspace is separate from public SEO pages', async () => {
  const html = await readFile(join(outputRoot, 'index.html'), 'utf8');
  assert.match(html, /<meta name="robots" content="[^"]*noindex/);
});

test('both Compose engines include executable and Wasm resources in the exported site', async () => {
  for (const engine of ['js', 'wasm']) {
    const engineRoot = join(outputRoot, 'compose', engine);
    assert.ok((await stat(join(engineRoot, 'index.html'))).isFile());
    assert.ok((await stat(join(engineRoot, 'webApp.js'))).isFile());
    assert.ok((await stat(join(engineRoot, 'quantity-widget.js'))).isFile());
    assert.ok((await stat(join(engineRoot, 'quantity-widget.js.LICENSE.txt'))).isFile());
    const widgetBundle = await readFile(join(engineRoot, 'quantity-widget.js'), 'utf8');
    assert.match(widgetBundle, /FixVietnamQuantityWidget/);
    const index = await readFile(join(engineRoot, 'index.html'), 'utf8');
    assert.match(index, /src="quantity-widget\.js"/);
    const files = await readdir(engineRoot, { recursive: true });
    assert.ok(files.some((file) => file.endsWith('.wasm')), `${engine} runtime needs its Wasm asset`);
  }
});

test('React can use the generated Kotlin API in a server runtime without browser DOM', async () => {
  assert.equal(typeof document, 'undefined');
  const packageRoot = join(projectRoot, 'app', 'sharedLogic', 'build', 'dist', 'js', 'productionLibrary');
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  const { WebCatalogSearch } = await import(pathToFileURL(join(packageRoot, manifest.main)).href);
  const search = new WebCatalogSearch();
  assert.equal(search.matches('SP-002', 'Găng tay bảo hộ', '  sp-002  '), true);
  assert.equal(search.matches('SP-002', 'Găng tay bảo hộ', 'GĂNG TAY'), true);
  assert.equal(search.matches('SP-002', 'Găng tay bảo hộ', ''), true);
  assert.equal(search.matches('SP-002', 'Găng tay bảo hộ', 'SP-003'), false);
});
