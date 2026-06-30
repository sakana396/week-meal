const requiredMajor = 22;
const requiredMinor = 12;
const [major, minor] = process.versions.node.split(".").map(Number);

const isSupported =
  major > requiredMajor || (major === requiredMajor && minor >= requiredMinor);

if (!isSupported) {
  console.error(`
Node.js ${requiredMajor}.${requiredMinor}.0 以上が必要です。
現在の Node.js は ${process.versions.node} です。

ローカルの Node.js を更新するか、Docker で起動してください。

  npm run docker:install
  npm run dev:docker
`);
  process.exit(1);
}
