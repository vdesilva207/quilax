const detox = require('detox');
const config = require('./detox.config');

before(async () => {
  // Set detox configuration
  await detox.init(config);
});

after(async () => {
  await detox.cleanup();
});
