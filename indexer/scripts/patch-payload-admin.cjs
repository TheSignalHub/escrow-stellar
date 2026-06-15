const fs = require('node:fs');
const path = require('node:path');

const buildDir = process.env.PAYLOAD_ADMIN_BUILD_PATH || path.join(__dirname, '..', 'build');
const mainFile = fs
  .readdirSync(buildDir)
  .filter((file) => /^main\..+\.js$/.test(file))
  .map((file) => ({
    file,
    mtime: fs.statSync(path.join(buildDir, file)).mtimeMs,
  }))
  .sort((a, b) => b.mtime - a.mtime)[0]?.file;

if (!mainFile) {
  throw new Error(`Could not find Payload admin main bundle in ${buildDir}`);
}

const bundlePath = path.join(buildDir, mainFile);
let source = fs.readFileSync(bundlePath, 'utf8');

const utilityMatch =
  source.match(
    /extractTranslations:function\(\)\{return ([A-Za-z_$][\w$]*)\.extractTranslations\}[\s\S]{0,1200}?let [^;]*?\1=n\((\d+)\)/
  ) ||
  source.match(
    /extractTranslations:function\(\)\{return ([A-Za-z_$][\w$]*)\.extractTranslations\}[\s\S]{0,2000}?\1=n\((\d+)\)/
  );

let moduleMatch;
let extractModuleId;

if (utilityMatch) {
  extractModuleId = utilityMatch[2];
  const modulePattern = new RegExp(
    `${extractModuleId}\\(e,t,n\\)\\{"use strict";var ([A-Za-z_$][\\w$]*);\\(\\1=n\\((\\d+)\\)\\)&&\\1\\.__esModule\\}`
  );
  moduleMatch = source.match(modulePattern);
}

if (!moduleMatch) {
  const directPattern =
    /(\d+)\(e,t,n\)\{"use strict";var ([A-Za-z_$][\w$]*);\(\2=n\((\d+)\)\)&&\2\.__esModule\}/g;
  const candidates = [...source.matchAll(directPattern)];
  moduleMatch = candidates.find((candidate) => {
    const after = source.slice(candidate.index + candidate[0].length, candidate.index + 3000);
    return /Object\.defineProperty\(t,"default"/.test(after) && /let L=\{ar:/.test(after);
  });

  if (moduleMatch) {
    extractModuleId = moduleMatch[1];
  }
}

if (!moduleMatch) {
  console.log('Payload extractTranslations module already looks patched.');
  process.exit(0);
}

const translationsModuleId = moduleMatch[3] || moduleMatch[2];
const replacement = `${extractModuleId}(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"extractTranslations",{enumerable:!0,get:function(){return r}});let a=n(${translationsModuleId});const o=a&&a.__esModule?a.default:a,r=e=>{const t={};return e.forEach(e=>{t[e]={}}),Object.entries(o).forEach(([n,a])=>{e.forEach(e=>{const[r,o]=e.split(":");t[e][n]=a?.[r]?.[o]??e})}),t}}`;

source = source.replace(moduleMatch[0], replacement);
fs.writeFileSync(bundlePath, source);
console.log(`Patched Payload admin extractTranslations in ${mainFile}`);
