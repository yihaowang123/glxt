const { execSync } = require('child_process');
const path = require('path');

console.log('Node version:', process.version);
console.log('Starting npm install in:', path.resolve('.'));

try {
  execSync('npm install', {
    cwd: path.resolve('.'),
    stdio: 'inherit',
    shell: true
  });
  console.log('npm install completed successfully');
} catch(e) {
  console.error('npm install failed:', e.message);
  process.exit(1);
}