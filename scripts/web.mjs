import { spawn } from 'node:child_process';
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reactRoot = join(projectRoot, 'app', 'webReact');
const composeOutput = join(reactRoot, 'public', 'compose');
const action = process.argv[2] ?? 'prepare';
const gradleOptions = [];

for (let index = 3; index < process.argv.length; index += 1) {
  const option = process.argv[index];
  if (option === '--gradle-user-home' && process.argv[index + 1]) {
    gradleOptions.push(option, resolve(process.argv[++index]));
  } else if (option === '--offline') {
    gradleOptions.push(option);
  } else {
    throw new Error(`Unsupported option: ${option}`);
  }
}

if (!['prepare', 'install', 'build', 'dev'].includes(action)) {
  throw new Error(`Unsupported action: ${action}`);
}

function run(command, args, cwd = projectRoot) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd, shell: false, stdio: 'inherit',
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${command} failed (${signal ?? code}).`));
    });
  });
}

const javaCommand = process.env.JAVA_HOME
  ? join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
  : 'java';

await run(javaCommand, [
  '-classpath', join(projectRoot, 'gradle', 'wrapper', 'gradle-wrapper.jar'),
  'org.gradle.wrapper.GradleWrapperMain',
  ...gradleOptions,
  ':app:sharedLogic:jsBrowserProductionLibraryDistribution',
  ':app:webApp:jsBrowserDistribution',
  ':app:webApp:wasmJsBrowserDistribution',
  '--console=plain',
]);

const distributions = [
  ['js', join(projectRoot, 'app', 'webApp', 'build', 'dist', 'js', 'productionExecutable')],
  ['wasm', join(projectRoot, 'app', 'webApp', 'build', 'dist', 'wasmJs', 'productionExecutable')],
];

for (const [, source] of distributions) {
  if (!(await stat(join(source, 'index.html'))).isFile()) {
    throw new Error(`Missing Compose distribution: ${source}`);
  }
}
// Only replace generated Compose assets inside the current project.
const outputRelative = relative(projectRoot, composeOutput);
if (isAbsolute(outputRelative) || outputRelative.startsWith(`..${sep}`) || outputRelative === '..' || !outputRelative) {
  throw new Error('Compose output must be a child of this project.');
}
await rm(composeOutput, { recursive: true, force: true });
await mkdir(composeOutput, { recursive: true });
for (const [engine, source] of distributions) {
  await cp(source, join(composeOutput, engine), { recursive: true });
}

async function bundleQuantityWidget() {
  const jsBundle = join(composeOutput, 'js', 'quantity-widget.js');
  await run(process.execPath, [join(reactRoot, 'scripts', 'build-widget.mjs'), jsBundle], reactRoot);
  await cp(jsBundle, join(composeOutput, 'wasm', 'quantity-widget.js'));
  const license = `${jsBundle}.LICENSE.txt`;
  await cp(license, join(composeOutput, 'wasm', 'quantity-widget.js.LICENSE.txt'));
}

if (action !== 'prepare') {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('Run this script through npm run web:install/build/dev.');
  if (action === 'install') {
    await run(process.execPath, [npmCli, 'install', '--prefix', reactRoot, '--install-links=false']);
    await bundleQuantityWidget();
  } else {
    await bundleQuantityWidget();
    await run(process.execPath, [npmCli, 'run', action, '--prefix', reactRoot]);
  }
} else {
  // Fresh clones can prepare the Kotlin outputs before installing npm dependencies.
  // The copied placeholder keeps standalone Compose usable until web:install runs.
  try {
    if ((await stat(join(reactRoot, 'node_modules', 'next', 'package.json'))).isFile()) {
      await bundleQuantityWidget();
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}
