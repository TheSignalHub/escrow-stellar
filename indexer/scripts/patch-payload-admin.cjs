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

const utilityMatch = source.match(
  /extractTranslations:function\(\)\{return ([A-Za-z_$][\w$]*)\.extractTranslations\}[\s\S]{0,1200}?let [^;]*?\1=n\((\d+)\)/
);

if (!utilityMatch) {
  throw new Error('Could not locate Payload utilities extractTranslations import');
}

const extractModuleId = utilityMatch[2];
const modulePattern = new RegExp(
  `${extractModuleId}\\(e,t,n\\)\\{"use strict";var ([A-Za-z_$][\\w$]*);\\(\\1=n\\((\\d+)\\)\\)&&\\1\\.__esModule\\}`
);
const moduleMatch = source.match(modulePattern);

if (!moduleMatch) {
  console.log('Payload extractTranslations module already looks patched.');
  process.exit(0);
}

const translationsModuleId = moduleMatch[2];
const replacement = `${extractModuleId}(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"extractTranslations",{enumerable:!0,get:function(){return r}});let a=n(${translationsModuleId});const o=a&&a.__esModule?a.default:a,r=e=>{const t={};return e.forEach(e=>{t[e]={}}),Object.entries(o).forEach(([n,a])=>{e.forEach(e=>{const[r,o]=e.split(":");t[e][n]=a?.[r]?.[o]??e})}),t}}`;

source = source.replace(modulePattern, replacement);
fs.writeFileSync(bundlePath, source);
console.log(`Patched Payload admin extractTranslations in ${mainFile}`);
