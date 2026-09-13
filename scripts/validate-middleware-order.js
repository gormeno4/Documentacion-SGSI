#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates that app.ts has the correct middleware order:
 * 1. trust proxy
 * 2. Helmet (no 'unsafe-inline')
 * 3. CORS
 * 4. Rate Limiter
 * 5. HPP
 * 6. Body Parser
 */

const APP_FILE = path.join(__dirname, '../api-sgsi/src/app.ts');
const MIDDLEWARE_ORDER = ['trust proxy', 'helmet', 'cors', 'rate limit', 'hpp', 'body parser'];
const VIOLATIONS = [];

function validateMiddlewareOrder() {
  if (!fs.existsSync(APP_FILE)) {
    console.warn(`⚠️  app.ts not found at ${APP_FILE}`);
    return false;
  }

  const content = fs.readFileSync(APP_FILE, 'utf8');
  const lines = content.split('\n');

  let lastIndex = -1;
  let helmetHasUnsafeInline = false;

  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();

    // Check each middleware
    MIDDLEWARE_ORDER.forEach((middleware) => {
      if (lowerLine.includes(middleware)) {
        const currentIndex = MIDDLEWARE_ORDER.indexOf(middleware);
        if (currentIndex < lastIndex) {
          VIOLATIONS.push({
            line: index + 1,
            issue: `${middleware} is out of order`,
            expected: `after ${MIDDLEWARE_ORDER[lastIndex]}`,
          });
        }
        lastIndex = currentIndex;
      }
    });

    // Check Helmet security
    if (lowerLine.includes('helmet') && lowerLine.includes('unsafe-inline')) {
      helmetHasUnsafeInline = true;
      VIOLATIONS.push({
        line: index + 1,
        issue: "Helmet configuration contains 'unsafe-inline'",
        expected: "Remove 'unsafe-inline' for security",
      });
    }

    // Check body limit
    if (lowerLine.includes('express.json') || lowerLine.includes('body parser')) {
      if (lowerLine.includes('limit') && !lowerLine.includes('10kb') && !lowerLine.includes('10 kb')) {
        VIOLATIONS.push({
          line: index + 1,
          issue: 'Body parser limit is not 10kb',
          expected: 'Use limit: "10kb" (or 50mb for file uploads)',
        });
      }
    }
  });

  return VIOLATIONS.length === 0;
}

// Main
console.log('🔍 Validating middleware order in app.ts...\n');
const isValid = validateMiddlewareOrder();

if (isValid) {
  console.log('✅ Middleware order is correct and secure');
  process.exit(0);
} else {
  console.log(`❌ Found ${VIOLATIONS.length} middleware violation(s):\n`);
  VIOLATIONS.forEach((v) => {
    console.log(`  Line ${v.line}: ${v.issue}`);
    console.log(`  Expected: ${v.expected}\n`);
  });
  process.exit(1);
}
