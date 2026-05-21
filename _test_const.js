// Testa se const pode ser redeclarada no escopo global
const vm = require('vm');

// Script 1: declara const
const script1 = "const TODAY = '2026-03-17'; const COLORS = ['blue'];";

// Script 2: tenta redeclarar const (igual helpers.js original)
const script2_bad = "const TODAY = '2026-03-17'; const COLORS = ['blue'];";

// Script 2: fix - remove const (igual helpers.js corrigido)
const script2_fixed = "// sem const TODAY ou COLORS";

const ctx = { console };
vm.createContext(ctx);

try {
  vm.runInContext(script1, ctx);
  console.log('Script 1 OK');
  console.log('  TODAY =', ctx.TODAY);
  console.log('  COLORS =', ctx.COLORS);
  
  // Test bad version (original bug)
  try {
    vm.runInContext(script2_bad, ctx);
    console.log('SCRIPT2_BAD: OK (const redeclaration permitida)');
  } catch(e) {
    console.log('SCRIPT2_BAD: FALHOU - ' + e.message.substring(0, 100));
  }
} catch(e) {
  console.log('Script 1 falhou: ' + e.message);
}
