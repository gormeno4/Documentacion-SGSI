#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates that delete operations are soft deletes.
 *
 * Approach:
 * 1. Extract function calls from queries/*.ts (e.g., sgsi.v2_kpi_delete_by_id)
 * 2. Resolve to actual SQL function file: api-sgsi/sql/sgsi/database/<schema>/functions/<name>.sql
 * 3. Check the SQL body for hard delete (DELETE FROM) vs soft delete (deleted_at = now() or is_active = false)
 * 4. For hard deletes, resolve the table and check if it has soft-delete columns
 *    - If table HAS soft-delete columns: ❌ VIOLATION (should be UPDATE soft-delete)
 *    - If table has NO soft-delete columns: ⚠️ ACCEPTABLE (link table)
 */

const QUERIES_DIR = path.join(__dirname, '../api-sgsi/src/queries');
const DB_FUNCTIONS_BASE = path.join(__dirname, '../api-sgsi/sql/sgsi/database');

const VIOLATIONS = [];
const WARNINGS = [];
const SKIPPED = [];

// Regex to extract function calls: sgsi.v2_kpi_delete_by_id($1, $2) -> {schema: 'sgsi', name: 'v2_kpi_delete_by_id'}
const FUNCTION_CALL_REGEX = /\b(sgsi|corvus)\.([a-z0-9_]+)\s*\(/gi;

// Patterns to detect delete type
const HARD_DELETE_PATTERN = /\bDELETE\s+FROM\s+(\S+)/i;
const SOFT_DELETE_PATTERN = /SET[\s\S]*?(is_active\s*=\s*false|deleted_at\s*=\s*now\s*\(\))/i;

// Pattern to detect soft-delete columns in table definition
const SOFT_DELETE_COLUMNS_PATTERN = /(is_active|deleted_at|deleted_by)\s+(boolean|timestamp|uuid)/i;

function resolveFunctionPath(schema, functionName) {
  return path.join(DB_FUNCTIONS_BASE, schema, 'functions', `${functionName}.sql`);
}

function resolveTablePath(schema, tableName) {
  return path.join(DB_FUNCTIONS_BASE, schema, 'tables', `${tableName}.sql`);
}

function hasSoftDeleteColumns(tableName, schema) {
  const tableFile = resolveTablePath(schema, tableName);
  if (!fs.existsSync(tableFile)) {
    return null; // Unknown, skip check
  }

  const content = fs.readFileSync(tableFile, 'utf8');
  return SOFT_DELETE_COLUMNS_PATTERN.test(content);
}

function extractDeletedTables(sqlContent) {
  const tables = [];
  const matches = [...sqlContent.matchAll(/\bDELETE\s+FROM\s+(\S+)/gi)];
  matches.forEach((match) => {
    tables.push(match[1]); // e.g., 'sgsi.kpi' or 'corvus.user'
  });
  return [...new Set(tables)]; // Dedupe
}

function analyzeFunctionBody(sqlContent) {
  const hasHardDelete = HARD_DELETE_PATTERN.test(sqlContent);
  const hasSoftDelete = SOFT_DELETE_PATTERN.test(sqlContent);
  const deletedTables = hasHardDelete ? extractDeletedTables(sqlContent) : [];

  return { hasHardDelete, hasSoftDelete, deletedTables };
}

function extractFunctionCalls(content, queryFile) {
  const calls = [];
  let match;

  FUNCTION_CALL_REGEX.lastIndex = 0;

  while ((match = FUNCTION_CALL_REGEX.exec(content)) !== null) {
    const schema = match[1];
    const functionName = match[2];
    const lineNum = content.substring(0, match.index).split('\n').length;

    calls.push({
      schema,
      functionName,
      queryFile,
      line: lineNum,
      fullName: `${schema}.${functionName}`,
    });
  }

  return calls;
}

function validateSoftDeletes() {
  if (!fs.existsSync(QUERIES_DIR)) {
    console.warn(`⚠️  Queries directory not found: ${QUERIES_DIR}`);
    return;
  }

  const files = fs.readdirSync(QUERIES_DIR);
  files.forEach((file) => {
    if (!file.endsWith('.ts') && !file.endsWith('.js')) return;

    const filePath = path.join(QUERIES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    const calls = extractFunctionCalls(content, path.relative(process.cwd(), filePath));

    calls.forEach((call) => {
      const sqlFilePath = resolveFunctionPath(call.schema, call.functionName);

      if (!fs.existsSync(sqlFilePath)) {
        SKIPPED.push({
          queryFile: call.queryFile,
          line: call.line,
          function: call.fullName,
          reason: `SQL function file not found: ${path.relative(process.cwd(), sqlFilePath)}`,
        });
        return;
      }

      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      const { hasHardDelete, hasSoftDelete, deletedTables } = analyzeFunctionBody(sqlContent);

      // Classify
      if (hasHardDelete && !hasSoftDelete) {
        // Check if deleted tables have soft-delete columns
        const problemTables = [];
        const acceptableTables = [];

        deletedTables.forEach((tableRef) => {
          // Parse "schema.table" or just "table"
          const [schemaOrTable, maybeTable] = tableRef.split('.');
          const [actualSchema, actualTable] = maybeTable
            ? [schemaOrTable, maybeTable]
            : [call.schema, schemaOrTable];

          const hasSoftDelete = hasSoftDeleteColumns(actualTable, actualSchema);

          if (hasSoftDelete === true) {
            problemTables.push(tableRef);
          } else if (hasSoftDelete === false) {
            acceptableTables.push(tableRef);
          }
          // if null (table not found), skip classification
        });

        if (problemTables.length > 0) {
          VIOLATIONS.push({
            queryFile: call.queryFile,
            line: call.line,
            function: call.fullName,
            sqlFile: path.relative(process.cwd(), sqlFilePath),
            issue: `Hard delete on table(s) that support soft-delete: ${problemTables.join(', ')}`,
            recommendation: 'Convert to UPDATE ... SET deleted_at = now() or is_active = false',
            severity: 'CRITICAL',
          });
        }

        if (acceptableTables.length > 0 && problemTables.length === 0) {
          WARNINGS.push({
            queryFile: call.queryFile,
            line: call.line,
            function: call.fullName,
            sqlFile: path.relative(process.cwd(), sqlFilePath),
            issue: `Hard delete on link/join table(s): ${acceptableTables.join(', ')}`,
            note: 'Acceptable for tables without soft-delete columns',
            severity: 'ACCEPTABLE',
          });
        }
      } else if (hasSoftDelete && !hasHardDelete) {
        // Pure soft delete - OK
      } else if (hasHardDelete && hasSoftDelete) {
        // Both patterns - suspicious
        VIOLATIONS.push({
          queryFile: call.queryFile,
          line: call.line,
          function: call.fullName,
          sqlFile: path.relative(process.cwd(), sqlFilePath),
          issue: 'Function contains both hard delete (DELETE FROM) and soft-delete pattern',
          recommendation: 'Separate overloads or clarify intent',
          severity: 'MEDIUM',
        });
      }
    });
  });
}

// Main
console.log('🔍 Validating soft deletes (cross-checking with table schemas)...\n');
validateSoftDeletes();

const criticalCount = VIOLATIONS.filter((v) => v.severity === 'CRITICAL').length;
const mediumCount = VIOLATIONS.filter((v) => v.severity === 'MEDIUM').length;

if (criticalCount === 0 && mediumCount === 0) {
  console.log('✅ All delete functions use soft-delete patterns (deleted_at or is_active)');

  if (WARNINGS.length > 0) {
    console.log(
      `\n✓ ${WARNINGS.length} acceptable hard-delete pattern(s) on link tables:\n`
    );
    WARNINGS.forEach((w) => {
      console.log(`  📄 Query: ${w.queryFile}:${w.line}`);
      console.log(`     Function: ${w.function}`);
      console.log(`     ${w.issue}`);
      console.log(`     Note: ${w.note}\n`);
    });
  }

  if (SKIPPED.length > 0) {
    console.log(`\n⚠️  ${SKIPPED.length} function call(s) skipped (not found in database/):\n`);
    SKIPPED.forEach((s) => {
      console.log(`  📄 ${s.queryFile}:${s.line}`);
      console.log(`     Function: ${s.function}`);
      console.log(`     ${s.reason}\n`);
    });
  }

  process.exit(0);
} else {
  console.log(
    `❌ Found ${criticalCount} CRITICAL and ${mediumCount} MEDIUM violation(s):\n`
  );

  VIOLATIONS.filter((v) => v.severity === 'CRITICAL').forEach((v) => {
    console.log(`  🔴 CRITICAL - Query: ${v.queryFile}:${v.line}`);
    console.log(`     Function: ${v.function}`);
    console.log(`     Function file: ${v.sqlFile}`);
    console.log(`     ${v.issue}`);
    console.log(`     → ${v.recommendation}\n`);
  });

  VIOLATIONS.filter((v) => v.severity === 'MEDIUM').forEach((v) => {
    console.log(`  🟡 MEDIUM - Query: ${v.queryFile}:${v.line}`);
    console.log(`     Function: ${v.function}`);
    console.log(`     Function file: ${v.sqlFile}`);
    console.log(`     ${v.issue}`);
    console.log(`     → ${v.recommendation}\n`);
  });

  if (WARNINGS.length > 0) {
    console.log(`\n✓ ${WARNINGS.length} acceptable hard-delete pattern(s) on link tables:\n`);
    WARNINGS.forEach((w) => {
      console.log(`  📄 Query: ${w.queryFile}:${w.line}`);
      console.log(`     Function: ${w.function}`);
      console.log(`     ${w.issue}\n`);
    });
  }

  process.exit(1);
}
