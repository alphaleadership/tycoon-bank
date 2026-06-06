const { execSync } = require('child_process');
const fs = require('fs');

console.log('Running pre-push checks...');

try {
  // Run tests / check stability
  console.log('Checking syntax and stability...');
  execSync('node -c main.js', { stdio: 'inherit' });
  
  // Increment version
  console.log('Incrementing version...');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  let parts = pkg.version.split('.');
  parts[2] = parseInt(parts[2], 10) + 1;
  pkg.version = parts.join('.');
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  console.log('Version bumped to ' + pkg.version);
  
  // Try to commit the version bump
  try {
    execSync('git add package.json', { stdio: 'inherit' });
    execSync('git commit -m "chore: bump version to ' + pkg.version + '"', { stdio: 'inherit' });
  } catch (e) {
    // might fail if there's nothing to commit
  }

  console.log('Pre-push checks passed successfully!');
} catch (error) {
  console.error('Pre-push checks failed!', error.message);
  process.exit(1);
}
