const { withAppBuildGradle } = require('@expo/config-plugins');

// Debug builds need their own applicationId so they install side-by-side with
// the release app on a test device instead of colliding with it (mismatched
// signing keys otherwise blocks `adb install`). Expo prebuild regenerates
// android/app/build.gradle from scratch every time, so without this plugin
// that separation gets silently dropped on the next `expo prebuild --clean`.
const MARKER = 'applicationIdSuffix ".dev"';
// `signingConfig signingConfigs.debug` also appears in buildTypes.release, so
// anchor on `debug {` immediately followed by it — that combination only
// occurs in buildTypes.debug (signingConfigs.debug opens with `storeFile` instead).
const ANCHOR = /debug\s*\{\s*\n(\s*)signingConfig signingConfigs\.debug/;

function withAndroidDevApplicationId(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('withAndroidDevApplicationId only supports Groovy build.gradle files');
    }

    if (config.modResults.contents.includes(MARKER)) {
      return config;
    }

    if (!ANCHOR.test(config.modResults.contents)) {
      throw new Error('withAndroidDevApplicationId: could not find buildTypes.debug block in build.gradle');
    }

    config.modResults.contents = config.modResults.contents.replace(
      ANCHOR,
      (match, indent) =>
        `debug {\n${indent}applicationIdSuffix ".dev"\n${indent}resValue "string", "app_name", "Barrow Dev"\n${indent}signingConfig signingConfigs.debug`
    );

    return config;
  });
}

module.exports = withAndroidDevApplicationId;
