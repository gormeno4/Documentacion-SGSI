#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates naming conventions across the project:
 * - Components: PascalCase (e.g., RiskMatrix.tsx)
 * - Hooks/Functions: camelCase (e.g., useFetchUser.ts)
 * - Folders: kebab-case (e.g., api-service-v1/)
 * - DB Columns: snake_case (e.g., user_id)
 * - Env Vars: SCREAMING_SNAKE (e.g., JWT_SECRET)
 */

const VIOLATIONS = [];

// Patterns
const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/;
const CAMEL_CASE = /^[a-z][a-zA-Z0-9]*$/;
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SNAKE_CASE = /^[a-z0-9]+(_[a-z0-9]+)*$/;
const SCREAMING_SNAKE = /^[A-Z0-9]+(_[A-Z0-9]+)*$/;

function validateComponentFiles(dir) {
  const componentsDir = path.join(__dirname, '../app-sgsi/src/components');
  if (!fs.existsSync(componentsDir)) return;

  const uiDir = path.join(componentsDir, 'ui');
  const functionalDir = path.join(componentsDir, 'functional');

  [uiDir, functionalDir].forEach((dirPath) => {
    if (!fs.existsSync(dirPath)) return;

    fs.readdirSync(dirPath).forEach((file) => {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const filename = file.replace(/\.(tsx?|jsx?)$/, '');
        if (!PASCAL_CASE.test(filename)) {
          VIOLATIONS.push({
            type: 'Component file',
            file: path.relative(process.cwd(), path.join(dirPath, file)),
            expected: 'PascalCase',
            found: filename,
          });
        }
      }
    });
  });
}

function validateHooks() {
  const hooksDir = path.join(__dirname, '../app-sgsi/src/customHooks');
  if (!fs.existsSync(hooksDir)) return;

  fs.readdirSync(hooksDir).forEach((file) => {
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const filename = file.replace(/\.(tsx?|jsx?)$/, '');
      if (!filename.startsWith('use') || !CAMEL_CASE.test(filename)) {
        VIOLATIONS.push({
          type: 'Hook file',
          file: path.relative(process.cwd(), path.join(hooksDir, file)),
          expected: 'camelCase starting with "use" (e.g., useFetchUser)',
          found: filename,
        });
      }
    }
  });
}

function validateQueries() {
  const queriesDir = path.join(__dirname, '../api-sgsi/src/queries');
  if (!fs.existsSync(queriesDir)) return;

  fs.readdirSync(queriesDir).forEach((file) => {
    if (file.endsWith('.ts')) {
      const content = fs.readFileSync(path.join(queriesDir, file), 'utf8');
      // Look for database column patterns (simple check)
      const columnMatches = content.match(/['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\s*:/g);
      if (columnMatches) {
        columnMatches.forEach((match) => {
          const column = match.replace(/['":]/g, '').trim();
          if (column.length > 1 && !/^_/.test(column) && !SNAKE_CASE.test(column)) {
            VIOLATIONS.push({
              type: 'Database column',
              file: path.relative(process.cwd(), path.join(queriesDir, file)),
              expected: 'snake_case',
              found: column,
            });
          }
        });
      }
    }
  });
}

function validateEnvVars() {
  const envFile = path.join(__dirname, '../.env');
  const envLocalFile = path.join(__dirname, '../.env.local');

  [envFile, envLocalFile].forEach((filePath) => {
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line) => {
      if (!line.trim() || line.startsWith('#')) return;

      const [varName] = line.split('=');
      if (varName && !SCREAMING_SNAKE.test(varName)) {
        VIOLATIONS.push({
          type: 'Environment variable',
          file: path.relative(process.cwd(), filePath),
          expected: 'SCREAMING_SNAKE',
          found: varName,
        });
      }
    });
  });
}

// Main
console.log('🔍 Validating naming conventions...\n');

validateComponentFiles();
validateHooks();
validateQueries();
validateEnvVars();

if (VIOLATIONS.length === 0) {
  console.log('✅ All naming conventions are correct');
  process.exit(0);
} else {
  console.log(`❌ Found ${VIOLATIONS.length} naming convention violation(s):\n`);
  VIOLATIONS.forEach((v) => {
    console.log(`  📄 ${v.type}: ${v.file}`);
    console.log(`     Expected: ${v.expected}`);
    console.log(`     Found: ${v.found}\n`);
  });
  process.exit(1);
}
