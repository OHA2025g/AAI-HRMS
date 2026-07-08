/**
 * Regenerate hiring-dashboard-mock-exact.css from pixel-perfect HTML mocks.
 * Sources: smart_hiring_pixel_perfect_react/src/data/{overview,pipeline,offers,interviews,signals,analytics}.js
 *
 * Run: npm run sync-mock-css
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const dataDir = path.join(root, 'smart_hiring_pixel_perfect_react/src/data');
const outPath = path.join(__dirname, '../src/styles/hiring-dashboard-mock-exact.css');

const TAB_SOURCES = ['overview.js', 'pipeline.js', 'offers.js', 'interviews.js', 'signals.js', 'analytics.js'];

const SIDEBAR_SELECTORS = new Set(['sidebar', 'brand', 'logo', 'nav', 'assistant']);

function loadHtmlFromModule(fileName) {
  const moduleText = fs.readFileSync(path.join(dataDir, fileName), 'utf8');
  const htmlMatch = moduleText.match(/const html = "([\s\S]*)"\s*;\s*export default html/);
  if (!htmlMatch) throw new Error(`Could not parse ${fileName}`);
  const html = JSON.parse(`"${htmlMatch[1]}"`);
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) throw new Error(`Could not extract <style> from ${fileName}`);
  return styleMatch[1];
}

function isSidebarSelector(selector) {
  const first = selector.trim().split(/[\s>+~]/)[0].replace(/^\./, '');
  if (SIDEBAR_SELECTORS.has(first)) return true;
  if (/^\.nav\s/.test(selector) || selector.startsWith('.nav a')) return true;
  if (selector.startsWith('.assistant')) return true;
  return false;
}

function mapSelector(selector) {
  const s = selector.trim();
  if (s === ':root') return '.hiring-dashboard-root';
  if (s === '*') return '.hiring-dashboard-root *, .hd-mock-layout *';
  if (s === 'body') return '.hd-mock-layout, .hd-mock-main';
  if (s === '.app') return '.hd-mock-layout';
  if (s === '.main') return '.hd-mock-main';
  if (isSidebarSelector(s)) return `.hd-mock-layout ${s}`;
  if (s.startsWith('.')) return `.hiring-dashboard-root ${s}`;
  return s;
}

function splitRules(css) {
  const rules = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        rules.push(css.slice(start, i + 1));
        start = i + 1;
      }
    }
  }
  return rules.map((r) => r.trim()).filter(Boolean);
}

function ruleKey(block) {
  const trimmed = block.trim();
  if (trimmed.startsWith('@media')) return trimmed;
  const open = trimmed.indexOf('{');
  if (open === -1) return trimmed;
  const selectorPart = trimmed
    .slice(0, open)
    .split(',')
    .map((s) => mapSelector(s).replace(/\s+/g, ' ').trim())
    .sort()
    .join(',');
  const body = trimmed.slice(open).replace(/\s+/g, ' ').trim();
  return `${selectorPart} ${body}`;
}

function transformRuleBlock(block) {
  const trimmed = block.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('@media')) {
    const open = trimmed.indexOf('{');
    const header = trimmed.slice(0, open + 1);
    const inner = trimmed.slice(open + 1, trimmed.lastIndexOf('}'));
    const innerRules = splitRules(inner);
    const transformed = innerRules.map(transformRuleBlock).filter(Boolean).join('\n');
    return `${header}\n${transformed}\n}`;
  }
  const open = trimmed.indexOf('{');
  if (open === -1) return trimmed;
  const selectorPart = trimmed.slice(0, open);
  const bodyPart = trimmed.slice(open);
  const selectors = selectorPart.split(',').map(mapSelector).join(',\n');
  return `${selectors} ${bodyPart}`;
}

function mergeCssFromSources(sources) {
  const seen = new Set();
  const out = [];
  sources.forEach((file, index) => {
    const raw = loadHtmlFromModule(file);
    splitRules(raw).forEach((block) => {
      const transformed = transformRuleBlock(block);
      const key = ruleKey(block);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(transformed);
    });
  });
  return out.join('\n\n');
}

const extensions = `
.hiring-dashboard-root {
  color: var(--text);
  font-family: Inter, system-ui, sans-serif;
}

.hiring-dashboard-root.top-operational .top h1 {
  font-size: 30px;
  letter-spacing: -0.04em;
}

.hiring-dashboard-root.top-operational .top {
  margin-bottom: 20px;
}

.hiring-dashboard-root.top-operational .actions {
  gap: 12px;
  align-items: center;
}

.hiring-dashboard-root .btn.primary-btn {
  background: linear-gradient(135deg, #6d4cff, #5144e7);
  color: white;
  border: 0;
}

.hiring-dashboard-root .live {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #eef2f7;
  color: #64748b;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 18px;
}

.hiring-dashboard-root .live::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
}

.hiring-dashboard-root .toggle {
  width: 42px;
  height: 22px;
  background: #e2e8f0;
  border-radius: 999px;
  position: relative;
  display: inline-block;
}

.hiring-dashboard-root .toggle::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  top: 2px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.hd-mock-layout .sidebar {
  z-index: 40;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.hd-mock-layout .sidebar.sidebar--collapsed {
  width: 72px;
  padding-left: 12px;
  padding-right: 12px;
}

.hd-mock-main--collapsed {
  margin-left: 72px;
  width: calc(100% - 72px);
}

.hd-mock-layout .sidebar.sidebar--collapsed .brand h2,
.hd-mock-layout .sidebar.sidebar--collapsed .brand p,
.hd-mock-layout .sidebar.sidebar--collapsed .assistant {
  display: none;
}

.hd-mock-layout .sidebar .sh-collapse-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  border: 0;
  background: rgba(255, 255, 255, 0.1);
  color: #e5e7eb;
  border-radius: 8px;
  padding: 6px;
  cursor: pointer;
}

.hd-mock-layout .nav {
  flex: 1;
}

.hd-mock-layout .brand h2 {
  color: #fff;
}

.hd-mock-layout .assistant p {
  color: #dbeafe;
  font-size: 13px;
}

.hd-mock-layout .assistant b {
  font-weight: 700;
}

.hd-mock-layout .assistant a.mock-assistant-btn {
  border: 0;
  background: #fff;
  color: #5b21b6;
  border-radius: 10px;
  padding: 10px 18px;
  font-weight: 700;
  margin-top: 12px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  text-decoration: none;
  display: inline-block;
}

.hiring-dashboard-root .hero--stacked {
  grid-template-columns: 1fr;
}

.hiring-dashboard-root .hero--stacked .risk-list {
  border: 0;
  padding: 0;
}

.hiring-dashboard-root .pill.medium {
  background: #fef3c7;
  color: #b45309;
}

.hiring-dashboard-root .primary,
.hiring-dashboard-root a.primary {
  cursor: pointer;
  font-family: inherit;
  text-decoration: none;
  display: inline-block;
}

.hiring-dashboard-root .btn,
.hiring-dashboard-root .tab,
.hiring-dashboard-root .clear-filter,
.hiring-dashboard-root .mini,
.hiring-dashboard-root .mini-btn {
  cursor: pointer;
  font-family: inherit;
  appearance: none;
}

.hiring-dashboard-root .section-title a {
  cursor: pointer;
  text-decoration: none;
}

.hiring-dashboard-root .funnel-shape {
  flex-shrink: 0;
}

.hiring-dashboard-root .funnel-list b {
  font-weight: 800;
}

.hiring-dashboard-root .card > h3 {
  margin: 0 0 16px;
}

.hiring-dashboard-root .card > p {
  margin: 8px 0 0;
}

.hiring-dashboard-root .quality .q h4 {
  margin: 0;
}

.hiring-dashboard-root .quality .q .num {
  font-size: 31px;
  font-weight: 800;
}

.hiring-dashboard-root .quality .q small {
  color: var(--muted);
  font-size: 13px;
}

.hiring-dashboard-root .hero h4 {
  margin: 0;
}

.hiring-dashboard-root .ai p {
  margin: 0;
}

.hiring-dashboard-root .pkpi .num {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.04em;
}

@media (max-width: 760px) {
  .hiring-dashboard-root .tabs {
    grid-template-columns: repeat(2, 1fr);
  }
}
`;

const header = `/**
 * AUTO-SYNCED from smart_hiring_pixel_perfect_react/src/data/*.js
 * Run: npm run sync-mock-css
 */
`;

const merged = mergeCssFromSources(TAB_SOURCES);
fs.writeFileSync(outPath, `${header}${merged}\n${extensions}`);
console.log(`Wrote ${outPath} from ${TAB_SOURCES.length} tab mocks (${fs.statSync(outPath).size} bytes)`);
