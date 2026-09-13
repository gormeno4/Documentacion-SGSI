#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates that:
 * - Frontend (app-sgsi): Uses Zod
 * - Backend (api-sgsi): Uses Joi
 */

const FRONTEND_DIR = path.join(__dirname, '../app-sgsi/src');
const BACKEND_DIR = path.join(__dirname, '../api-sgsi/src');
const VIOLATIONS = [];

function scanDirectory(dir, expectedEngine, engineName) {
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  Directory not found: ${dir}`);
    return;
  }

  const scanFile = (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js')) {
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const trimmed = line.trim();

        // Check for wrong validation engine
        if (expectedEngine === 'zod') {
          if (trimmed.includes("import") && trimmed.includes('joi')) {
            VIOLATIONS.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              issue: `Frontend should use Zod, not Joi`,
              found: `import ... from 'joi'`,
              expected: `import { z } from 'zod'`,
            });
          }
        } else if (expectedEngine === 'joi') {
          if (trimmed.includes("import") && trimmed.includes('zod')) {
            VIOLATIONS.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              issue: `Backend should use Joi, not Zod`,
              found: `import { z } from 'zod'`,
              expected: `import Joi from 'joi'`,
            });
          }
        }
      });
    } catch (err) {
      // Silently skip unreadable files
    }
  };

  const walkDir = (dirPath) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walkDir(fullPath);
      } else if (entry.isFile()) {
        scanFile(fullPath);
      }
    });
  };

  walkDir(dirPath);
}

// Main
console.log('🔍 Validating validation engines (Zod/Joi)...\n');

console.log('📁 Scanning frontend (app-sgsi)...');
scanDirectory(FRONTEND_DIR, 'zod', 'Zod');

console.log('📁 Scanning backend (api-sgsi)...');
scanDirectory(BACKEND_DIR, 'joi', 'Joi');

if (VIOLATIONS.length === 0) {
  console.log('\n✅ Validation engines are correct (Zod in frontend, Joi in backend)');
  process.exit(0);
} else {
  console.log(`\n❌ Found ${VIOLATIONS.length} validation engine violation(s):\n`);
  VIOLATIONS.forEach((v) => {
    console.log(`  📄 ${v.file}:${v.line}`);
    console.log(`     Issue: ${v.issue}`);
    console.log(`     Found: ${v.found}`);
    console.log(`     Expected: ${v.expected}\n`);
  });
  process.exit(1);
}
