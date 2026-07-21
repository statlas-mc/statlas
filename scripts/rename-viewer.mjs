import fs from 'fs'
// Move the built single-file viewer into public/ as a .txt so Vite's dev server
// treats it as a static asset (not an HTML entry to transform). The studio
// fetches it as text and injects the payload at export time.
const from = 'viewer-dist/viewer.html'
const to = 'public/viewer-template.txt'
if (fs.existsSync(from)) {
  fs.copyFileSync(from, to)
  fs.rmSync('viewer-dist', { recursive: true, force: true })
  console.log('viewer template ->', to)
} else {
  console.error('viewer build not found at', from)
  process.exit(1)
}
