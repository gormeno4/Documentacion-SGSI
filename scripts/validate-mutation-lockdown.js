#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates that during async operations (isLoading, isSubmitting),
 * ALL inputs are disabled, not just the submit button.
 */

const FUNCTIONAL_DIR = path.join(__dirname, '../app-sgsi/src/components/functional');
const VIOLATIONS = [];

function validateMutationLockdown() {
  if (!fs.existsSync(FUNCTIONAL_DIR)) {
    console.warn(`⚠️  Functional components directory not found: ${FUNCTIONAL_DIR}`);
    return;
  }

  const files = fs.readdirSync(FUNCTIONAL_DIR);
  files.forEach((file) => {
    if (!file.endsWith('.tsx')) return;

    const filePath = path.join(FUNCTIONAL_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let hasIsLoading = false;
    let hasIsSubmitting = false;
    let buttonsWithDisabled = 0;
    let inputsWithDisabled = 0;
    let totalInputs = 0;
    let totalButtons = 0;

    lines.forEach((line) => {
      if (line.includes('isLoading') || line.includes('isSubmitting')) {
        hasIsLoading = hasIsLoading || line.includes('isLoading');
        hasIsSubmitting = hasIsSubmitting || line.includes('isSubmitting');
      }

      // Count buttons
      if (line.includes('<button')) {
        totalButtons++;
        if (line.includes('disabled={isLoading}') || line.includes('disabled={isSubmitting}')) {
          buttonsWithDisabled++;
        }
      }

      // Count inputs
      if (line.includes('<input') || line.includes('<select') || line.includes('<textarea')) {
        totalInputs++;
        if (line.includes('disabled={isLoading}') || line.includes('disabled={isSubmitting}') ||
            line.includes('readOnly={isLoading}') || line.includes('readOnly={isSubmitting}')) {
          inputsWithDisabled++;
        }
      }
    });

    // Validation
    if ((hasIsLoading || hasIsSubmitting) && totalInputs > 0) {
      if (inputsWithDisabled < totalInputs) {
        VIOLATIONS.push({
          file: path.relative(process.cwd(), filePath),
          issue: `Only ${inputsWithDisabled}/${totalInputs} inputs are locked during mutation`,
          details: `Found isLoading/isSubmitting but not all inputs have disabled prop`,
        });
      }
    }
  });
}

// Main
console.log('🔍 Validating mutation lockdown (input locking)...\n');
validateMutationLockdown();

if (VIOLATIONS.length === 0) {
  console.log('✅ All forms have proper mutation lockdown (all inputs locked during async operations)');
  process.exit(0);
} else {
  console.log(`⚠️  Found ${VIOLATIONS.length} potential mutation lockdown issue(s):\n`);
  VIOLATIONS.forEach((v) => {
    console.log(`  📄 ${v.file}`);
    console.log(`     ${v.issue}`);
    console.log(`     ${v.details}\n`);
  });
  process.exit(1);
}
