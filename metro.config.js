const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Skip dependency validation that requires network (fixes "fetch failed" crash)
config.server = {
  ...config.server,
};

// Prefer CJS (`require`) over ESM (`import`) when resolving package exports
// **on web only**. Fixes Zustand v5's ESM build using `import.meta.env.MODE`,
// which is a SyntaxError when Metro serves the bundle as a classic <script>.
// On native (iOS/Android) we leave the default conditions untouched, so
// React Native gets its proper exports.
//
// NOTE: Metro forcibly prepends "import" to the condition list whenever the
// source file declared the import via `import` syntax (see
// `metro-resolver/src/utils/matchSubpathFromExportsLike.js`, which branches on
// `context.isESMImport`). So setting `unstable_conditionNames` alone is not
// enough — we also have to flip `isESMImport` to `false` on web so Metro uses
// the "require" condition first.
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (platform === 'web') {
      return context.resolveRequest(
        {
          ...context,
          isESMImport: false,
          unstable_conditionNames: ['require', 'browser', 'default'],
        },
        moduleName,
        platform,
      );
    }
    return (upstreamResolveRequest || context.resolveRequest)(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
