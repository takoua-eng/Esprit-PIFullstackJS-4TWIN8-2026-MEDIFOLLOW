const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // The corrupted em dash appears as: U+00E2 U+20AC U+201D (â€")
  // This is the Windows-1252 misread of UTF-8 bytes E2 80 94
  const badEmDash = '\u00e2\u20ac\u201d'; // â€"
  const goodEmDash = '\u2014'; // —
  
  let changed = false;
  if (content.includes(badEmDash)) {
    content = content.split(badEmDash).join(goodEmDash);
    changed = true;
  }
  
  // Also fix corrupted medal emojis if present
  // 🥇 = U+1F947, corrupted as: U+00F0 U+009F U+00A5 U+2021 (ðŸ¥‡)
  // Already fixed in coordinators, but check others
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', filePath);
  } else {
    console.log('No change needed:', filePath);
  }
}

const files = [
  'frontend/src/app/pages/super-admin/audit-logs/audit-detail-dialog.ts',
  'frontend/src/app/pages/auditor/auditor-dashboard/auditor-dashboard.component.ts',
  'frontend/src/app/pages/auditor/auditor-patients/auditor-patients.component.ts',
  'frontend/src/app/pages/auditor/auditor-anomalies/auditor-anomalies.component.ts',
  'frontend/src/app/pages/auditor/auditor-coordinators/auditor-coordinators.component.ts',
];

files.forEach(fixFile);

// Verify
['frontend/src/app/pages/auditor/auditor-dashboard/auditor-dashboard.component.ts',
 'frontend/src/app/pages/super-admin/audit-logs/audit-detail-dialog.ts'].forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  const idx = c.indexOf('\u2014');
  console.log(f.split('/').pop(), 'has proper em dash:', idx >= 0, 'at index', idx);
  if (idx >= 0) console.log('  context:', JSON.stringify(c.substring(idx-20, idx+20)));
});
