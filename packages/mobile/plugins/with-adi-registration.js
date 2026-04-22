const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Expo config plugin: drops android/app/src/main/assets/adi-registration.properties
// into the generated Android project at prebuild time. Google Play's package-name
// ownership verification requires this file inside the APK's assets/ directory
// with the account-specific snippet as its raw contents.
//
// Snippet is passed via the `snippet` plugin option (typically sourced from
// env var ADI_REGISTRATION_SNIPPET) so we never commit the account identifier.
// If the snippet is empty the plugin no-ops — useful for contributors who
// don't have Play Console access.
module.exports = function withAdiRegistration(config, { snippet } = {}) {
  if (!snippet) {
    console.warn(
      '[with-adi-registration] ADI_REGISTRATION_SNIPPET not set; skipping. ' +
        'Builds from this config will NOT be accepted by Play Console ownership verification.'
    );
    return config;
  }
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const assetsDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets'
      );
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.writeFileSync(
        path.join(assetsDir, 'adi-registration.properties'),
        snippet,
        'utf8'
      );
      return cfg;
    },
  ]);
};
