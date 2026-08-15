/**
 * Real-network smoke test for the proxy plugin: fetch wttr.in through the
 * default socks5h proxy using the actual execFile curl path.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const PROXY = 'socks5h://127.0.0.1:10808'
const URL = 'https://wttr.in/chengdu?format=3'

async function main() {
  try {
    const { stdout } = await execFileAsync('curl.exe', ['-sS', '--max-time', '20', '-x', PROXY, URL], {
      timeout: 30000,
      windowsHide: true,
    })
    console.log('PROXY CURL OK:', stdout.trim())
    process.exit(0)
  } catch (error) {
    console.error('PROXY CURL FAIL:', error.message)
    if (error.stderr) console.error('stderr:', String(error.stderr).trim())
    process.exit(1)
  }
}

main()
