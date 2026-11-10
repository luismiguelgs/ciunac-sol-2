// Next's supported test-only font response hook; no production font changes.
module.exports = new Proxy({}, {
  get(_target, url) {
    const family = new URL(url).searchParams.get('family').split(':')[0].replaceAll('+', ' ')
    return `/* latin */\n@font-face { font-family: '${family}'; font-style: normal; font-weight: 100 900; src: url(https://fonts.test/fixture.woff2) format('woff2'); }`
  },
})
