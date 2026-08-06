const { withProjectBuildGradle } = require('@expo/config-plugins');

// Notifee ships its Android artifacts in a local Maven repo inside its own
// package instead of publishing to a public registry. Expo prebuild doesn't
// wire this up automatically, so without this plugin every `expo prebuild`
// regenerates an android/build.gradle that fails to resolve `app.notifee:core`.
const NOTIFEE_REPO_MARKER = 'require.resolve(\'@notifee/react-native/package.json\')';

function withNotifeeAndroidMavenRepo(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('withNotifeeAndroidMavenRepo only supports Groovy build.gradle files');
    }

    if (config.modResults.contents.includes(NOTIFEE_REPO_MARKER)) {
      return config;
    }

    const anchor = 'allprojects {\n  repositories {';
    const injected = `def notifeeAndroidDir = new File(["node", "--print", "${NOTIFEE_REPO_MARKER}"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()\n\n${anchor}\n    maven { url "$notifeeAndroidDir/android/libs" }`;

    if (!config.modResults.contents.includes(anchor)) {
      throw new Error('withNotifeeAndroidMavenRepo: could not find allprojects/repositories block in build.gradle');
    }

    config.modResults.contents = config.modResults.contents.replace(anchor, injected);
    return config;
  });
}

module.exports = withNotifeeAndroidMavenRepo;
