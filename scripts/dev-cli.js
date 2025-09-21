#!/usr/bin/env node
const readline = require('node:readline');

console.log('Mock Codex CLI ready. Type instructions.');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

rl.on('line', (line) => {
  if (!line.trim()) {
    console.log('…waiting for instruction…');
    return;
  }
  if (line.trim() === 'exit') {
    console.log('Shutting down mock Codex session.');
    process.exit(0);
  }
  console.log(`[codex] acknowledged: ${line.trim()}`);
  console.log('> Completed request in mock environment.');
});

process.on('SIGINT', () => {
  console.log('Mock Codex received SIGINT, cleaning up.');
  process.exit(0);
});
