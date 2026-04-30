const fs = require('fs');
const path = require('path');

// Load route data
const routePath = path.join(__dirname, '..', '..', 'data', 'route_177.json');
if (!fs.existsSync(routePath)) {
  console.error('Route file not found at', routePath);
  process.exit(1);
}
const routeData = require(routePath);
const fares = routeData.fares || {};
const stages = routeData.stages || [];

function lookupFare(a, b) {
  const key = `${a}_to_${b}`;
  if (Object.prototype.hasOwnProperty.call(fares, key)) return fares[key];
  return null;
}

function fallbackCumulativeFare(a, b) {
  // sum consecutive stage fares (a->a+1, a+1->a+2, ...)
  let total = 0;
  for (let k = a; k < b; k++) {
    const key = `${k}_to_${k + 1}`;
    if (Object.prototype.hasOwnProperty.call(fares, key)) {
      total += fares[key];
    } else {
      // if missing, try any direct remaining key (k_to_b)
      const direct = `${k}_to_${b}`;
      if (Object.prototype.hasOwnProperty.call(fares, direct)) {
        total += fares[direct];
        break;
      }
      return null; // cannot compute
    }
  }
  return total;
}

const results = [];
for (let i = 0; i < stages.length; i++) {
  for (let j = i; j < stages.length; j++) {
    const from = stages[i];
    const to = stages[j];
    let fare = lookupFare(i, j);
    if (fare === null) fare = fallbackCumulativeFare(i, j);
    results.push({
      from_id: i,
      from_name: from && from.name ? from.name : null,
      to_id: j,
      to_name: to && to.name ? to.name : null,
      fare: fare,
    });
  }
}

// Write CSV
const csvLines = ['from_id,from_name,to_id,to_name,fare'];
for (const r of results) {
  csvLines.push(`${r.from_id},"${(r.from_name||'').replace(/"/g,'""')}",${r.to_id},"${(r.to_name||'').replace(/"/g,'""')}",${r.fare === null ? '' : r.fare}`);
}
const outCsv = path.join(__dirname, '..', '..', 'data', 'fare_table_route_177.csv');
fs.writeFileSync(outCsv, csvLines.join('\n'), 'utf8');

// Write JSON
const outJson = path.join(__dirname, '..', '..', 'data', 'fare_table_route_177.json');
fs.writeFileSync(outJson, JSON.stringify(results, null, 2), 'utf8');

console.log('Wrote fare table files:');
console.log(' -', outCsv);
console.log(' -', outJson);

// Print example lines for quick verification
const examples = results.filter(r => (
  (r.from_name === 'Kaduwela' && r.to_name === 'Pittugala') ||
  (r.from_name === 'Kothalawala' && r.to_name === 'Malabe')
));
for (const e of examples) console.log(`${e.from_name} -> ${e.to_name}: ${e.fare}`);

process.exit(0);
