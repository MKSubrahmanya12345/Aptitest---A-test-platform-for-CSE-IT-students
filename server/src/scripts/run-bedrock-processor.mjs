/**
 * Runner for Bedrock Question Processor
 * ES Module compatible
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Build and run using tsx ( TypeScript executor )
const scriptPath = join(__dirname, 'bedrock-question-processor.ts');

console.log('🚀 Starting Bedrock Question Processor...\n');

try {
  // Try using tsx if available, otherwise use node with ts-node/esm loader
  const args = process.argv.slice(2).join(' ');
  
  // Option 1: Using tsx (recommended)
  try {
    execSync(`npx tsx ${scriptPath} ${args}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (e) {
    // Option 2: Using ts-node with ESM loader
    console.log('Trying alternative method...');
    execSync(`node --loader ts-node/esm ${scriptPath} ${args}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, TS_NODE_TRANSPILE_ONLY: 'true' }
    });
  }
} catch (error) {
  console.error('\n❌ To run this script, install tsx:');
  console.error('   npm install -g tsx');
  console.error('   # or');
  console.error('   bun add -d tsx');
  console.error('\nThen run:');
  console.error('   npx tsx src/scripts/bedrock-question-processor.ts --dry-run --limit=10');
  process.exit(1);
}
