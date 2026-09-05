import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const viteEntry = path.join(root, 'node_modules/vite/bin/vite.js')
const winSystemNode = 'C:\\Program Files\\nodejs\\node.exe'

function nodeVersionOk(version) {
  const [major, minor] = version.split('.').map(Number)
  if (major > 22) return true
  if (major === 22 && minor >= 12) return true
  if (major === 20 && minor >= 19) return true
  return false
}

function readNodeVersion(nodePath) {
  const result = spawnSync(nodePath, ['--version'], { encoding: 'utf8' })
  if (result.status !== 0) return null
  return result.stdout.trim().replace(/^v/, '')
}

function startVite(nodePath) {
  const child = spawn(nodePath, [viteEntry], {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 1)
  })
}

const currentVersion = process.versions.node

if (nodeVersionOk(currentVersion)) {
  startVite(process.execPath)
} else if (process.platform === 'win32' && existsSync(winSystemNode)) {
  const systemVersion = readNodeVersion(winSystemNode)
  if (systemVersion && nodeVersionOk(systemVersion)) {
    console.warn(
      `Node ${currentVersion} is too old for Vite. Using system Node ${systemVersion} instead.`,
    )
    startVite(winSystemNode)
  } else {
    console.error(`Node.js ${currentVersion} is too old. Vite requires Node 20.19+ or 22.12+.`)
    process.exit(1)
  }
} else {
  console.error(`Node.js ${currentVersion} is too old. Vite requires Node 20.19+ or 22.12+.`)
  process.exit(1)
}
