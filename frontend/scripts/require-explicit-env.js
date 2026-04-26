function main() {
  const [, , platform] = process.argv

  if (!platform) {
    console.error('Usage: node scripts/require-explicit-env.js <android|ios>')
    process.exit(1)
  }

  const localScript = `${platform}:local`
  const sharedVpsScript = `${platform}:shared-vps`
  const prodScript = `build:${platform}:prod`

  console.error(
    [
      `Choose an explicit frontend environment before running ${platform}.`,
      `- local backend: npm run ${localScript}`,
      `- shared VPS: npm run ${sharedVpsScript}`,
      `- production build: npm run ${prodScript}`
    ].join('\n')
  )

  process.exit(1)
}

main()
