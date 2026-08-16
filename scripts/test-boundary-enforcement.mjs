import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const homePagePath = resolve('apps/web/src/pages/HomePage.tsx');
const sharedIndexPath = resolve('packages/shared-types/src/index.ts');

const originalHomeContent = readFileSync(homePagePath, 'utf-8');
const originalSharedContent = readFileSync(sharedIndexPath, 'utf-8');

console.log('=== Architectural Dependency Boundary Verification (Cross-Platform Node.js) ===\n');

try {
  console.log('1. Verifying initial clean state passes ESLint...');
  execSync('pnpm lint', { stdio: 'inherit' });
  console.log('✓ Clean state passed.\n');

  console.log('2. Testing negative case: Frontend (apps/web) importing Backend (@bookflow/api)...');
  const badHome = `import type { AppModule } from '@bookflow/api';\n${originalHomeContent}`;
  writeFileSync(homePagePath, badHome, 'utf-8');

  let webLintFailed = false;
  let webLintOutput = '';
  try {
    webLintOutput = execSync('pnpm --filter @bookflow/web lint', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    webLintFailed = true;
    webLintOutput = (error.stdout || '') + (error.stderr || '');
  }

  if (!webLintFailed || !webLintOutput.includes('Frontend (apps/web) must never import from backend')) {
    throw new Error(`Expected ESLint boundary rule to fail on apps/web importing @bookflow/api, but got:\n${webLintOutput}`);
  }
  console.log('✓ PASS: ESLint correctly blocked forbidden backend import into frontend.\n');

  // Restore HomePage before next test
  writeFileSync(homePagePath, originalHomeContent, 'utf-8');

  console.log('3. Testing negative case: Pure Contracts (packages/shared-types) importing ORM (@prisma/client)...');
  const badShared = `import type { PrismaClient } from '@prisma/client';\n${originalSharedContent}`;
  writeFileSync(sharedIndexPath, badShared, 'utf-8');

  let sharedLintFailed = false;
  let sharedLintOutput = '';
  try {
    sharedLintOutput = execSync('pnpm --filter @bookflow/shared-types lint', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    sharedLintFailed = true;
    sharedLintOutput = (error.stdout || '') + (error.stderr || '');
  }

  if (!sharedLintFailed || !sharedLintOutput.includes('Shared types must remain pure API contracts')) {
    throw new Error(`Expected ESLint boundary rule to fail on shared-types importing @prisma/client, but got:\n${sharedLintOutput}`);
  }
  console.log('✓ PASS: ESLint correctly blocked forbidden ORM import into pure shared types.\n');
} finally {
  // Always restore original files safely
  writeFileSync(homePagePath, originalHomeContent, 'utf-8');
  writeFileSync(sharedIndexPath, originalSharedContent, 'utf-8');
  console.log('Restored all source files to clean state.');
}

console.log('\n4. Verifying clean state passes ESLint after test completion...');
execSync('pnpm lint', { stdio: 'inherit' });
console.log('\n=== All Cross-Platform Architectural Boundary Tests Passed! ===\n');
