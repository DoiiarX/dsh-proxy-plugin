// 检查 execFile curl 在 Windows 上是否弹出控制台窗口
// 用 node 的原生 spawn（不经 promisify）观察
import { spawn } from 'node:child_process'

console.log('开始 execFile + winpty 检测...')
// 探测：如果 execFile 默认创建了可见窗口，这里将看到
const child = spawn('curl.exe', ['-sS','--max-time','10','-x','socks5h://127.0.0.1:10808','https://wttr.in/chengdu?format=3'], {
  windowsHide: false, // 故意 false，看是否弹窗
  stdio: ['ignore','pipe','pipe'],
})
child.stdout.on('data', d => process.stdout.write(String(d)))
child.stderr.on('data', d => process.stderr.write(String(d)))
child.on('close', code => { console.log('\n[node] 结束, code='+code) })
