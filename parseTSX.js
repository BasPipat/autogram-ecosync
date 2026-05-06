const fs = require('fs');
const ts = require('typescript');
const src = fs.readFileSync('src/app/master-settings/page.tsx', 'utf8');
const res = ts.createSourceFile('page.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
console.log('diagnostics', res.parseDiagnostics.length);
res.parseDiagnostics.forEach(d => console.log(d.messageText, 'at', d.start, 'len', d.length));
