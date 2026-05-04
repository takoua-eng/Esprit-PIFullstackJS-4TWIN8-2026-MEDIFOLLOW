const fs = require('fs');

function fixEmDash(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // The corrupted sequence: bytes E2 80 94 read as latin1 = â€"
  // In a JS string read as utf8, these appear as the 3 chars: â (e2), € (80 as latin1 = €? no)
  // Actually when a UTF-8 file is read correctly, â€" would only appear if the file was
  // saved with double-encoding. Let's check what we actually have:
  
  // The JSON.stringify showed: 'â€"' - these are the actual chars in the string
  // â = U+00E2, € = U+20AC (but that's 3 bytes in utf8), " = U+201C? 
  // Actually from the hex output earlier the file has the bytes for the UTF-8 em dash
  // but they were interpreted as Windows-1252/Latin-1 when the file was created
  
  // The string 'â€"' in a JS utf8 string means the file literally contains those 3 chars
  // Let's replace them with proper em dash
  const badEmDash = '\u00e2\u0080\u0094'; // â€" as individual unicode chars
  const goodEmDash = '\u2014'; // —
  
  if (content.includes(badEmDash)) {
    content = content.split(badEmDash).join(goodEmDash);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', filePath);
    return true;
  }
  console.log('No fix needed:', filePath);
  return false;
}

const files = [
  'frontend/src/app/pages/super-admin/audit-logs/audit-detail-dialog.ts',
  'frontend/src/app/pages/auditor/auditor-dashboard/auditor-dashboard.component.ts',
  'frontend/src/app/pages/auditor/auditor-patients/auditor-patients.component.ts',
  'frontend/src/app/pages/auditor/auditor-anomalies/auditor-anomalies.component.ts',
  'frontend/src/app/pages/auditor/auditor-coordinators/auditor-coordinators.component.ts',
];

files.forEach(fixEmDash);

// Verify dashboard
const dash = fs.readFileSync('frontend/src/app/pages/auditor/auditor-dashboard/auditor-dashboard.component.ts', 'utf8');
const m = dash.match(/delayLabel\([\s\S]*?\n  \}/);
console.log('delayLabel:', JSON.stringify(m ? m[0] : 'not found'));
