/** @type {import('@lhci/cli/src/index').LHCI.ServerCommand.Options} */
module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:3000/dashboard'],
      numberOfRuns: 1,
      puppeteerScript: './e2e/lighthouse/auth.cjs',
      settings: {
        onlyCategories: ['accessibility'],
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
      },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
