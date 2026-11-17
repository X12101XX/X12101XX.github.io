'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatLocalDateTime(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function formatTimestampSlug(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function slugifyAscii(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeCustomSlug(input) {
  const ascii = slugifyAscii(input);
  if (ascii) return ascii;
  return String(input || '')
    .trim()
    .replace(/[\/\\:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatYamlScalar(value) {
  const str = String(value);
  const needsQuotes =
    str === '' ||
    /^\s|\s$/.test(str) ||
    /^[-?:,\[\]{}#&*!|>'"%@`]/.test(str) ||
    /:\s|:#|\s#|\n|\r/.test(str) ||
    /^(true|false|yes|no|on|off|null|~)$/i.test(str);
  return needsQuotes ? JSON.stringify(str) : str;
}

function resolveUniqueFilePath(dir, baseSlug) {
  let index = 1;
  while (true) {
    const suffix = index === 1 ? '' : `-${index}`;
    const candidate = path.join(dir, `${baseSlug}${suffix}.md`);
    if (!fs.existsSync(candidate)) {
      return candidate;
    }
    index += 1;
  }
}

function buildPostTemplate({ title, dateStr }) {
  return [
    '---',
    `title: ${formatYamlScalar(title)}`,
    `date: ${dateStr}`,
    'description: ',
    'categories: []',
    'tags: []',
    'typora-root-url: ..',
    'typora-copy-images-to: ../images',
    '---',
    '',
    '在这里开始记录。',
    '',
    '<!-- more -->',
    ''
  ].join('\n');
}

function getDefaultTyporaThemeDir({ platform = process.platform, homeDir = os.homedir(), env = process.env } = {}) {
  if (platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', 'abnerworks.Typora', 'themes');
  }
  if (platform === 'win32') {
    const appData = env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    return path.join(appData, 'Typora', 'themes');
  }
  return path.join(homeDir, '.config', 'Typora', 'themes');
}

function parseCliArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] && !args[0].startsWith('-') ? args[0] : null;
  const rest = command ? args.slice(1) : args;

  const flags = {
    draft: command === 'draft',
    slug: '',
    dir: '',
    help: false
  };
  const positionals = [];

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === '--draft' || token === '-d') {
      flags.draft = true;
    } else if (token === '--help' || token === '-h') {
      flags.help = true;
    } else if (token === '--slug' && i + 1 < rest.length) {
      flags.slug = rest[++i];
    } else if (token.startsWith('--slug=')) {
      flags.slug = token.slice('--slug='.length);
    } else if (token === '--dir' && i + 1 < rest.length) {
      flags.dir = rest[++i];
    } else if (token.startsWith('--dir=')) {
      flags.dir = token.slice('--dir='.length);
    } else if (token === '--') {
      positionals.push(...rest.slice(i + 1));
      break;
    } else {
      positionals.push(token);
    }
  }

  return { command, flags, positionals };
}

function createNote({
  title,
  draft = false,
  slug = '',
  rootDir = ROOT_DIR,
  now = new Date()
}) {
  const trimmedTitle = String(title || '').trim();
  if (!trimmedTitle) {
    throw new Error('Title is required. Example: npm run new -- "文章标题"');
  }

  const targetDir = path.join(rootDir, 'source', draft ? '_drafts' : '_posts');
  fs.mkdirSync(targetDir, { recursive: true });

  const timestampSlug = formatTimestampSlug(now);
  const baseSlug = slug
    ? (sanitizeCustomSlug(slug) || `note-${timestampSlug}`)
    : (slugifyAscii(trimmedTitle) || `note-${timestampSlug}`);

  const dateStr = formatLocalDateTime(now);
  const content = buildPostTemplate({ title: trimmedTitle, dateStr });

  let filePath = resolveUniqueFilePath(targetDir, baseSlug);
  while (true) {
    try {
      fs.writeFileSync(filePath, content, { encoding: 'utf8', flag: 'wx' });
      break;
    } catch (error) {
      if (error && error.code === 'EEXIST') {
        filePath = resolveUniqueFilePath(targetDir, baseSlug);
        continue;
      }
      throw error;
    }
  }

  return {
    filePath,
    relativePath: path.relative(rootDir, filePath),
    slug: path.basename(filePath, '.md'),
    draft
  };
}

function installTheme({
  dir = '',
  rootDir = ROOT_DIR,
  platform = process.platform,
  homeDir = os.homedir(),
  env = process.env
} = {}) {
  const sourceCss = path.join(rootDir, 'typora', 'marginalia.css');
  if (!fs.existsSync(sourceCss)) {
    throw new Error(`Theme stylesheet not found: ${sourceCss}`);
  }

  const explicitDir = Boolean(dir && String(dir).trim());
  const themeDir = explicitDir
    ? path.resolve(String(dir).trim())
    : getDefaultTyporaThemeDir({ platform, homeDir, env });

  const fontsSourceDir = path.join(rootDir, 'themes', 'marginalia', 'source', 'fonts');
  const typoraParentDir = path.dirname(themeDir);
  if (!explicitDir && !fs.existsSync(themeDir) && !fs.existsSync(typoraParentDir)) {
    return {
      installed: false,
      reason: 'missing-typora-dir',
      themeDir,
      sourceCss,
      fontsSourceDir
    };
  }

  try {
    fs.mkdirSync(themeDir, { recursive: true });
    const targetCss = path.join(themeDir, 'marginalia.css');
    fs.copyFileSync(sourceCss, targetCss);

    const copiedFonts = [];
    if (fs.existsSync(fontsSourceDir)) {
      const targetFontDir = path.join(themeDir, 'marginalia');
      fs.mkdirSync(targetFontDir, { recursive: true });
      const entries = fs.readdirSync(fontsSourceDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!/\.(woff2?|ttf|otf|txt)$/i.test(entry.name)) continue;
        const src = path.join(fontsSourceDir, entry.name);
        const dest = path.join(targetFontDir, entry.name);
        fs.copyFileSync(src, dest);
        copiedFonts.push(dest);
      }
    }

    return {
      installed: true,
      themeDir,
      targetCss,
      copiedFonts
    };
  } catch (error) {
    if (!explicitDir && error && ['EROFS', 'EACCES', 'EPERM'].includes(error.code)) {
      return {
        installed: false,
        reason: 'unwritable-typora-dir',
        errorCode: error.code,
        themeDir,
        sourceCss,
        fontsSourceDir
      };
    }
    throw error;
  }
}

function printUsage() {
  console.log([
    'Typora Helper for Marginalia',
    '',
    'Usage:',
    '  node scripts/typora-helper.cjs new "<title>" [--slug <slug>] [--draft]',
    '  node scripts/typora-helper.cjs draft "<title>" [--slug <slug>]',
    '  node scripts/typora-helper.cjs install-theme [--dir <path>]',
    '',
    'npm shortcuts:',
    '  npm run new -- "文章标题"',
    '  npm run new -- "文章标题" --slug my-custom-slug',
    '  npm run draft -- "草稿标题"',
    '  npm run typora:theme',
    '  npm run typora:theme -- --dir "/path/to/Typora/themes"'
  ].join('\n'));
}

function runCli(argv = process.argv) {
  const { command, flags, positionals } = parseCliArgs(argv);

  if (flags.help || !command || command === 'help') {
    printUsage();
    return 0;
  }

  if (command === 'new' || command === 'draft') {
    const title = positionals.join(' ').trim();
    if (!title) {
      console.error('Error: missing post title.\n');
      printUsage();
      return 1;
    }

    const result = createNote({
      title,
      draft: flags.draft,
      slug: flags.slug
    });

    console.log(`Created ${result.draft ? 'draft' : 'post'}: ${result.relativePath}`);
    console.log(`Full path: ${result.filePath}`);
    console.log('');
    console.log('Next steps:');
    console.log(`  1. Open ${result.relativePath} in Typora and write.`);
    console.log('  2. Images pasted into Typora will save to source/images/ (via ../images).');
    if (result.draft) {
      console.log('  3. Preview locally: npx hexo server --draft');
      console.log(`  4. Publish when ready: npx hexo publish post "${result.slug}"`);
    } else {
      console.log('  3. Preview locally: npm run server');
      console.log('  4. Build static site: npm run build');
    }
    return 0;
  }

  if (command === 'install-theme') {
    const result = installTheme({ dir: flags.dir });
    if (!result.installed) {
      if (result.reason === 'unwritable-typora-dir') {
        console.log(`Typora theme directory is not writable (${result.errorCode}) at: ${result.themeDir}`);
      } else {
        console.log(`Typora theme directory was not found at: ${result.themeDir}`);
      }
      console.log('');
      console.log('You can still install the Marginalia Typora theme manually or pass --dir:');
      console.log('  1. In Typora, open Preferences -> Appearance -> Open Theme Folder.');
      console.log(`  2. Copy ${path.relative(ROOT_DIR, result.sourceCss)} into that folder.`);
      if (fs.existsSync(result.fontsSourceDir)) {
        console.log(`  3. Copy ${path.relative(ROOT_DIR, result.fontsSourceDir)}/* into <ThemeFolder>/marginalia/.`);
      }
      console.log('  4. Or specify a writable target directory directly:');
      console.log('     npm run typora:theme -- --dir "/path/to/Typora/themes"');
      return 0;
    }

    console.log(`Installed Typora theme CSS: ${result.targetCss}`);
    if (result.copiedFonts.length) {
      console.log(`Installed ${result.copiedFonts.length} font/license file(s) to: ${path.join(result.themeDir, 'marginalia')}`);
    } else {
      console.log('Note: bundled fonts were not found under themes/marginalia/source/fonts/; system fallback fonts will be used.');
    }
    console.log('');
    console.log('How to activate in Typora:');
    console.log('  1. Restart Typora if it is currently running.');
    console.log('  2. Select Themes -> Marginalia (主题 -> Marginalia).');
    console.log('  3. In Preferences -> Markdown, enable Inline Math, Block Math, Highlight (==), Footnotes, Task List, and GitHub Style Alerts.');
    return 0;
  }

  console.error(`Unknown subcommand: ${command}\n`);
  printUsage();
  return 1;
}

if (typeof hexo === 'undefined' && require.main === module) {
  try {
    process.exitCode = runCli(process.argv);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  buildPostTemplate,
  createNote,
  formatLocalDateTime,
  formatTimestampSlug,
  formatYamlScalar,
  getDefaultTyporaThemeDir,
  installTheme,
  parseCliArgs,
  runCli,
  sanitizeCustomSlug,
  slugifyAscii
};
