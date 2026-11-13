/**
 * Xcode 27 rejects pods with IPHONEOS_DEPLOYMENT_TARGET < 15.
 * Force every Pods target up to the app minimum.
 */
const { withPodfile } = require('expo/config-plugins');

const MARKER = '# quilax: bump pod deployment targets for Xcode 27';
const SNIPPET = `
  ${MARKER}
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      if current.nil? || current.to_f < 15.0
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
      end
    end
  end
`;

function injectPostInstall(contents) {
  if (contents.includes(MARKER)) return contents;
  // Insert before the closing of the existing post_install block's final `end`
  // Expo Podfile ends post_install with react_native_post_install(...)\n  end\nend
  const needle = 'react_native_post_install(';
  const idx = contents.lastIndexOf(needle);
  if (idx === -1) {
    throw new Error('withPodDeploymentTarget: react_native_post_install not found in Podfile');
  }
  // Find the `end` that closes post_install (after react_native_post_install call)
  const after = contents.slice(idx);
  const endMatch = after.match(/\n  end\n/);
  if (!endMatch) {
    throw new Error('withPodDeploymentTarget: could not find post_install end');
  }
  const insertAt = idx + endMatch.index;
  return contents.slice(0, insertAt) + SNIPPET + contents.slice(insertAt);
}

module.exports = function withPodDeploymentTarget(config) {
  return withPodfile(config, (mod) => {
    mod.modResults.contents = injectPostInstall(mod.modResults.contents);
    return mod;
  });
};
