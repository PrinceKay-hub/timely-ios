const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFollyFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // The fix injection string
      const fixSnippet = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        flags = config.build_settings['OTHER_CPLUSPLUSFLAGS'] || ''
        if !flags.include?('-DFOLLY_CFG_NO_COROUTINES=1')
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] = flags + ' -DFOLLY_CFG_NO_COROUTINES=1'
        end
      end
    end
      `;

      // Inject the code inside the existing post_install loop
      if (podfileContent.includes('post_install do |installer|')) {
        if (!podfileContent.includes('-DFOLLY_CFG_NO_COROUTINES=1')) {
          podfileContent = podfileContent.replace(
            'post_install do |installer|',
            `post_install do |installer|${fixSnippet}`
          );
          fs.writeFileSync(podfilePath, podfileContent, 'utf8');
          console.log('Successfully injected Folly coroutine compiler fix into Podfile.');
        }
      }
      return config;
    },
  ]);
};
