#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates JWT configuration:
 * - Access token: 15 min
 * - Refresh token: 7 days
 * - Refresh token cookie: httpOnly, Secure, SameSite=Strict
 * - bcryptjs cost >= 12
 */

const CONFIG_PATHS = [
  path.join(__dirname, '../api-sgsi/src/config/jwt.ts'),
  path.join(__dirname, '../api-sgsi/src/services/auth.service.ts'),
];

const VIOLATIONS = [];

function validateJWTConfig() {
  CONFIG_PATHS.forEach((configPath) => {
    if (!fs.existsSync(configPath)) {
      return; // Skip if not found
    }

    const content = fs.readFileSync(configPath, 'utf8');
    const lines = content.split('\n');

    let foundAccessTime = false;
    let foundRefreshTime = false;
    let foundHttpOnly = false;
    let foundSecure = false;
    let foundSameSite = false;
    let foundBcryptCost = false;

    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();

      // Check access token expiry (15 min = 900 seconds)
      if ((lowerLine.includes('access') && lowerLine.includes('expir')) || lowerLine.includes('accessexpir')) {
        if (lowerLine.includes('900') || lowerLine.includes('15m') || lowerLine.includes('15 min')) {
          foundAccessTime = true;
        } else if (lowerLine.includes('expir') && /\d+/.test(line)) {
          const matches = line.match(/\d+/g);
          if (matches && !matches.includes('900')) {
            VIOLATIONS.push({
              file: path.relative(process.cwd(), configPath),
              line: index + 1,
              issue: 'Access token expiry should be 15 min (900 seconds)',
              found: line.trim(),
            });
          }
        }
      }

      // Check refresh token expiry (7 days = 604800 seconds)
      if ((lowerLine.includes('refresh') && lowerLine.includes('expir')) || lowerLine.includes('refreshexpir')) {
        if (lowerLine.includes('604800') || lowerLine.includes('7d') || lowerLine.includes('7 days')) {
          foundRefreshTime = true;
        } else if (lowerLine.includes('expir') && /\d+/.test(line)) {
          const matches = line.match(/\d+/g);
          if (matches && !matches.includes('604800')) {
            VIOLATIONS.push({
              file: path.relative(process.cwd(), configPath),
              line: index + 1,
              issue: 'Refresh token expiry should be 7 days (604800 seconds)',
              found: line.trim(),
            });
          }
        }
      }

      // Check cookie flags
      if (lowerLine.includes('httponly')) foundHttpOnly = true;
      if (lowerLine.includes('secure')) foundSecure = true;
      if (lowerLine.includes('samesite') && lowerLine.includes('strict')) foundSameSite = true;

      // Check bcryptjs cost
      if (lowerLine.includes('bcrypt') && lowerLine.includes('cost')) {
        const matches = line.match(/\d+/g);
        if (matches && matches.some((n) => parseInt(n) >= 12)) {
          foundBcryptCost = true;
        } else {
          VIOLATIONS.push({
            file: path.relative(process.cwd(), configPath),
            line: index + 1,
            issue: 'bcryptjs cost factor should be >= 12',
            found: line.trim(),
          });
        }
      }
    });

    // Check if all required configs exist
    if (!foundAccessTime) {
      VIOLATIONS.push({
        file: path.relative(process.cwd(), configPath),
        line: 0,
        issue: 'Access token expiry not found or incorrect (should be 900 seconds / 15 min)',
      });
    }
    if (!foundRefreshTime) {
      VIOLATIONS.push({
        file: path.relative(process.cwd(), configPath),
        line: 0,
        issue: 'Refresh token expiry not found or incorrect (should be 604800 seconds / 7 days)',
      });
    }
    if (!foundHttpOnly) {
      VIOLATIONS.push({
        file: path.relative(process.cwd(), configPath),
        line: 0,
        issue: 'Refresh token cookie missing httpOnly flag',
      });
    }
    if (!foundSecure) {
      VIOLATIONS.push({
        file: path.relative(process.cwd(), configPath),
        line: 0,
        issue: 'Refresh token cookie missing Secure flag',
      });
    }
    if (!foundSameSite) {
      VIOLATIONS.push({
        file: path.relative(process.cwd(), configPath),
        line: 0,
        issue: 'Refresh token cookie missing SameSite=Strict',
      });
    }
  });
}

// Main
console.log('🔍 Validating JWT configuration...\n');
validateJWTConfig();

if (VIOLATIONS.length === 0) {
  console.log('✅ JWT configuration is correct');
  process.exit(0);
} else {
  console.log(`❌ Found ${VIOLATIONS.length} JWT configuration issue(s):\n`);
  VIOLATIONS.forEach((v) => {
    console.log(`  📄 ${v.file}${v.line > 0 ? `:${v.line}` : ''}`);
    console.log(`     ${v.issue}`);
    if (v.found) console.log(`     Found: ${v.found}`);
    console.log();
  });
  process.exit(1);
}
