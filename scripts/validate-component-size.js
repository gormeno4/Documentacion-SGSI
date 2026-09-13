#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates that functional components don't exceed 800 lines.
 */

const FUNCTIONAL_COMPONENTS_DIR = path.join(__dirname, '../app-sgsi/src/components/functional');
const MAX_LINES = 800;
const OVERSIZED_COMPONENTS = [];

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch (err) {
    console.error(`❌ Error reading ${filePath}: ${err.message}`);
    return 0;
  }
}

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  Functional components directory not found: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        const lineCount = countLines(filePath);
        if (lineCount > MAX_LINES) {
          OVERSIZED_COMPONENTS.push({
            file: path.relative(process.cwd(), filePath),
            lines: lineCount,
            excess: lineCount - MAX_LINES,
          });
        }
      }
    }
  });
}

// Main
console.log(`🔍 Validating functional component sizes (max ${MAX_LINES} lines)...\n`);
scanDirectory(FUNCTIONAL_COMPONENTS_DIR);

if (OVERSIZED_COMPONENTS.length === 0) {
  console.log('✅ All functional components are within 800-line limit');
  process.exit(0);
} else {
  console.log(`⚠️  Found ${OVERSIZED_COMPONENTS.length} component(s) exceeding 800 lines:\n`);
  OVERSIZED_COMPONENTS.forEach((c) => {
    console.log(`  📄 ${c.file}`);
    console.log(`     Lines: ${c.lines} (${c.excess} over limit)\n`);
  });
  process.exit(1);
}
