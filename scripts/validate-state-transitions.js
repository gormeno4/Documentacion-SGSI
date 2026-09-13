#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates that multi-stage workflows enforce state machine rules.
 * Checks for invalid state transitions in services layer.
 */

const SERVICES_DIR = path.join(__dirname, '../api-sgsi/src/services');
const VIOLATIONS = [];

function validateStateTransitions() {
  if (!fs.existsSync(SERVICES_DIR)) {
    console.warn(`⚠️  Services directory not found: ${SERVICES_DIR}`);
    return;
  }

  const files = fs.readdirSync(SERVICES_DIR);
  files.forEach((file) => {
    if (!file.endsWith('.service.ts') && !file.endsWith('.service.js')) return;

    const filePath = path.join(SERVICES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let hasStateTransitionLogic = false;
    let hasValidTransitionMap = false;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Check if file has workflow/state related logic
      if (
        trimmed.includes('status') || trimmed.includes('state') || trimmed.includes('workflow') ||
        trimmed.includes('Draft') || trimmed.includes('Review') || trimmed.includes('Approval')
      ) {
        hasStateTransitionLogic = true;
      }

      // Check for validation map of transitions
      if (
        trimmed.includes('validTransitions') || trimmed.includes('allowedTransitions') ||
        trimmed.includes('transitionMap') || trimmed.includes('stateMap')
      ) {
        hasValidTransitionMap = true;
      }

      // Warning: Direct state assignment without validation
      if (
        trimmed.includes('.status =') && !trimmed.includes('//') &&
        !trimmed.includes('validTransitions') && !trimmed.includes('if')
      ) {
        VIOLATIONS.push({
          file: path.relative(process.cwd(), filePath),
          line: index + 1,
          issue: 'Direct state assignment found without validation',
          found: line.trim(),
          expected: 'Validate state transition before assignment',
        });
      }
    });

    // If file has state logic but no transition validation
    if (hasStateTransitionLogic && !hasValidTransitionMap) {
      VIOLATIONS.push({
        file: path.relative(process.cwd(), filePath),
        line: 0,
        issue: 'No transition validation map found in state-aware service',
        expected: 'Add validTransitions object to enforce state machine rules',
      });
    }
  });
}

// Main
console.log('🔍 Validating state transitions (workflow enforcement)...\n');
validateStateTransitions();

if (VIOLATIONS.length === 0) {
  console.log('✅ State transitions appear to follow workflow rules');
  process.exit(0);
} else {
  console.log(`⚠️  Found ${VIOLATIONS.length} potential state transition issue(s):\n`);
  VIOLATIONS.forEach((v) => {
    console.log(`  📄 ${v.file}${v.line > 0 ? `:${v.line}` : ''}`);
    console.log(`     ${v.issue}`);
    if (v.found) console.log(`     Found: ${v.found}`);
    if (v.expected) console.log(`     Expected: ${v.expected}`);
    console.log();
  });
  process.exit(1);
}
