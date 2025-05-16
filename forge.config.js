// forge.config.js

const path = require('path');

module.exports = {
  packagerConfig: {
    // Configuration options for electron-packager
    platform: 'win32',
    // Other packager options as needed
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
      config: {
        // Configuration options for zip maker
      },
    },
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        // Configuration options for squirrel maker
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      config: {
        // macOS zip config if needed
      },
    },
    // Add more makers as needed for other packaging formats
  ],
};
