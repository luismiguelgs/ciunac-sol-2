import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { testEnvironment } from './fixtures/environment.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const env = testEnvironment()
const next = fileURLToPath(new URL('../../node_modules/next/dist/bin/next', import.meta.url))
const args = process.argv.includes('--build') ? ['build', '--webpack']
  : process.argv.includes('--production') ? ['start', '--port', '3100'] : ['dev', '--webpack', '--port', '3100']
if (!process.argv.includes('--build')) {
  mkdirSync(resolve('.next-e2e'), { recursive: true })
  writeFileSync(resolve('.next-e2e/student-events.jsonl'), '')
}
const child = spawn(process.execPath, [next, ...args], { env, stdio: 'inherit', windowsHide: true })
child.on('exit', (code) => process.exit(code ?? 1))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
