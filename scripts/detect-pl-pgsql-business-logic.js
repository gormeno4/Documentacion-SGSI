#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Detects PL/pgSQL functions/triggers that contain business logic.
 * PL/pgSQL should ONLY contain:
 * - Integrity checks
 * - Audit logging
 * - Massive aggregations
 *
 * NOT:
 * - Complex conditionals
 * - State machines
 * - Business rules
 * - Multi-table orchestration
 */

const DATABASE_DIR = path.join(__dirname, '../_database');
const VIOLATIONS = [];

// Patterns that suggest business logic (not just integrity)
const BUSINESS_LOGIC_PATTERNS = [
  /\bIF\s+.+THEN/i, // Complex IF-THEN
  /CASE\s+WHEN/i, // CASE statements (might be legitimate)
  /INSERT\s+INTO.*SELECT/i, // Complex inserts
  /UPDATE\s+.+WHERE\s+\(SELECT/i, // Complex updates
  /FOR\s+.*IN\s+SELECT/i, // Loops with SELECT
  /RAISE\s+EXCEPTION/i, // Business validation
];

// Patterns that are OK (integrity/audit)
const ALLOWED_PATTERNS = [
  /NEW\./i, // Referencing NEW row
  /OLD\./i, // Referencing OLD row
  /INSERT\s+INTO\s+audit/i, // Audit logging
  /INSERT\s+INTO\s+logs/i, // Logging
  /CONSTRAINT/i, // Constraint checks
];

function isSuspiciousPLpgSQL(content) {
  const lines = content.split('\n');
  let suspiciousLines = [];

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('--') || line.trim().startsWith('/*')) return;

    // Check for business logic patterns
    BUSINESS_LOGIC_PATTERNS.forEach((pattern) => {
      if (pattern.test(line)) {
        // But allow if it's just integrity checking
        let isAllowed = ALLOWED_PATTERNS.some((allowed) => allowed.test(line));

        if (!isAllowed) {
          suspiciousLines.push({
            line: index + 1,
            content: line.trim(),
            pattern: pattern.toString(),
          });
        }
      }
    });
  });

  return suspiciousLines;
}

function scanDatabase() {
  if (!fs.existsSync(DATABASE_DIR)) {
    console.warn(`⚠️  Database directory not found: ${DATABASE_DIR}`);
    return;
  }

  const walkDir = (dirPath) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.sql') || entry.name.endsWith('.plpgsql'))) {
        const content = fs.readFileSync(fullPath, 'utf8');

        // Check if it's a function or trigger
        if (
          content.toUpperCase().includes('CREATE FUNCTION') ||
          content.toUpperCase().includes('CREATE TRIGGER') ||
          content.toUpperCase().includes('CREATE PROCEDURE')
        ) {
          const suspicious = isSuspiciousPLpgSQL(content);
          if (suspicious.length > 0) {
            VIOLATIONS.push({
              file: path.relative(process.cwd(), fullPath),
              suspicions: suspicious,
            });
          }
        }
      }
    });
  };

  walkDir(DATABASE_DIR);
}

// Main
console.log('🔍 Detecting PL/pgSQL business logic (should be integrity-only)...\n');
scanDatabase();

if (VIOLATIONS.length === 0) {
  console.log('✅ PL/pgSQL contains only integrity/audit logic (no business logic detected)');
  process.exit(0);
} else {
  console.log(`⚠️  Found ${VIOLATIONS.length} file(s) with potential business logic in PL/pgSQL:\n`);
  VIOLATIONS.forEach((v) => {
    console.log(`  📄 ${v.file}`);
    v.suspicions.forEach((s) => {
      console.log(`     Line ${s.line}: ${s.content}`);
      console.log(`     Pattern: ${s.pattern}`);
    });
    console.log();
  });
  console.log('ℹ️  Business logic should be in Node.js services, not in PL/pgSQL.');
  process.exit(1);
}
