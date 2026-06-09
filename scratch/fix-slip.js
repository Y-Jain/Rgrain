const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/weighbridge/SlipModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of (weight / 100).toFixed(2) with getWeightInQtl(weight)
content = content.replace(/\(item\.net_weight \/ 100\)\.toFixed\(2\)/g, 'getWeightInQtl(item.net_weight)');
content = content.replace(/\(slip\.net_weight \/ 100\)\.toFixed\(2\)/g, 'getWeightInQtl(slip.net_weight)');
content = content.replace(/\(slip\.gross_weight \/ 100\)\.toFixed\(2\)/g, 'getWeightInQtl(slip.gross_weight)');
content = content.replace(/\(slip\.tare_weight \/ 100\)\.toFixed\(2\)/g, 'getWeightInQtl(slip.tare_weight)');
content = content.replace(/\(\(slip\.items\.reduce\(\(sum: number, item: any\) => sum \+ \(parseFloat\(item\.net_weight as any\) \|\| 0\), 0\) \/ 100\)\.toFixed\(2\)/g, 'getWeightInQtl(slip.items.reduce((sum: number, item: any) => sum + (parseFloat(item.net_weight as any) || 0), 0))');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed SlipModal weights');
