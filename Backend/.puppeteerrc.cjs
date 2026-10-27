const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location to a folder within project directory so it persists in cloud container deployments (Render/Heroku/AWS)
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
