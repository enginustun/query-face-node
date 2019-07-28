const fs = require('fs');
const path = require('path');
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const majorMinorVersion = (pkg.version || '0.0.0').substr(0, 3);

module.exports = {
  source: {
    include: ['./index.js'],
  },
  opts: {
    destination: `./docs/${pkg.name}/${majorMinorVersion}`,
    recurse: true,
  },
  templates: {
    default: {
      outputSourceFiles: false,
    },
  },
};