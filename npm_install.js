const npm = require('npm');
const path = require('path');

async function install() {
  const projectPath = 'd:\\GLXT\\GLXT';

  console.log('Loading npm...');
  await npm.load({
    loaded: false,
    prefix: projectPath,
    loglevel: 'verbose'
  });

  console.log('Running npm install...');
  await npm.commands.install(['--loglevel', 'verbose']);

  console.log('Install completed!');
}

install().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});