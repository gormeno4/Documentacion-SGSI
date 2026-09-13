#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Helper script to list existing ADRs from docs/adrs/ (plural) by section.
 * The actual decision analysis is done by Claude (this is just a helper).
 *
 * docs/adrs/ structure:
 *   00-transversal/
 *   01-contexto-alcance/
 *   02-gobierno/
 *   03-inventario-activos/
 *   04-gestion-riesgos/
 *   05-tratamiento-riesgos/
 *   06-controles-soa/
 *   07-flujo-documental/
 *   08-eventos-incidentes/
 *   09-catalogos/
 */

const ADR_BASE_DIR = path.join(__dirname, '../docs/adrs');
const ADR_SECTIONS = [
  '00-transversal',
  '01-contexto-alcance',
  '02-gobierno',
  '03-inventario-activos',
  '04-gestion-riesgos',
  '05-tratamiento-riesgos',
  '06-controles-soa',
  '07-flujo-documental',
  '08-eventos-incidentes',
  '09-catalogos',
];

function listADRsBySection() {
  const allADRs = [];

  if (!fs.existsSync(ADR_BASE_DIR)) {
    console.log('ℹ️  ADR directory does not exist yet: docs/adrs/');
    console.log('   Will be created when first ADR is documented.\n');
    return allADRs;
  }

  for (const section of ADR_SECTIONS) {
    const sectionDir = path.join(ADR_BASE_DIR, section);
    if (!fs.existsSync(sectionDir)) continue;

    const files = fs.readdirSync(sectionDir).filter((f) => f.startsWith('ADR-') && f.endsWith('.md'));
    for (const file of files) {
      allADRs.push({
        section,
        file,
        fullPath: path.join(sectionDir, file),
      });
    }
  }

  return allADRs.sort((a, b) => a.section.localeCompare(b.section) || a.file.localeCompare(b.file));
}

// Main
console.log('📋 Architecture Decision Records (ADR) Status\n');
console.log('═'.repeat(60));

const adrs = listADRsBySection();
if (adrs.length === 0) {
  console.log('\n✅ No ADRs found yet. Ready to document first one.');
  console.log('   Choose a section (00-transversal, 01-contexto-alcance, etc.)');
  console.log('   and create: ADR-001-titulo.md inside docs/adrs/<section>/\n');
} else {
  console.log(`\n📄 Existing ADRs (${adrs.length}):\n`);
  let lastSection = null;

  for (const adrItem of adrs) {
    if (adrItem.section !== lastSection) {
      console.log(`\n[${adrItem.section}]`);
      lastSection = adrItem.section;
    }

    const content = fs.readFileSync(adrItem.fullPath, 'utf8');

    // Extract estado and title (new template format)
    const estadoMatch = content.match(/^Estado:\s*(.+)$/m);
    const titleMatch = content.match(/^# ADR-\d+\s*—\s*(.+)$/m);

    const estado = estadoMatch ? estadoMatch[1].trim() : 'Unknown';
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

    console.log(`  ${adrItem.file}: ${title}`);
    console.log(`     Estado: ${estado}`);
  }
}

console.log('\n' + '═'.repeat(60));
console.log('\n✅ Helper ready. Use Claude to analyze decisions and create ADRs.');
console.log('   Follow template: docs/adrs/templates/template-decision.md');

process.exit(0);
