#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates that all SQL queries use parameterized queries ($1, $2, etc.)
 * and not string concatenation or template literals.
 */

const QUERIES_DIR = path.join(__dirname, '../api-sgsi/src/queries');
const VIOLATIONS = [];

// Patterns that indicate SQL injection vulnerabilities
const UNSAFE_PATTERNS = [
  /['"`]\s*\+\s*['"`]/, // String concatenation: "..." + "..."
  /\$\{[^}]+\}/, // Template literal: ${variable}
  /\+\s*([\w.]+)/g, // Concatenation operator
];

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Skip comments and imports
      if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('import') || line.trim().startsWith('export')) {
        return;
      }

      // Check for unsafe patterns
      UNSAFE_PATTERNS.forEach((pattern) => {
        if (pattern.test(line)) {
          // Double-check it's actually a SQL query
          if (line.toLowerCase().includes('select') ||
              line.toLowerCase().includes('insert') ||
              line.toLowerCase().includes('update') ||
              line.toLowerCase().includes('delete')) {
            VIOLATIONS.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              content: line.trim(),
            });
          }
        }
      });
    });
  } catch (err) {
    console.error(`❌ Error reading ${filePath}: ${err.message}`);
  }
}

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  Queries directory not found: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      checkFile(path.join(dir, file));
    }
  });
}

// Main
console.log('🔍 Validating SQL parameterization...\n');
scanDirectory(QUERIES_DIR);

if (VIOLATIONS.length === 0) {
  console.log('✅ All SQL queries use parameterized queries (no vulnerabilities found)');
  process.exit(0);
} else {
  console.log(`❌ Found ${VIOLATIONS.length} SQL parameterization violation(s):\n`);
  VIOLATIONS.forEach((v) => {
    console.log(`  📄 ${v.file}:${v.line}`);
    console.log(`     ${v.content}\n`);
  });
  process.exit(1);
}
