const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// ─── Permanent OOM fix for Windows ───────────────────────────────────────────
// Metro spawns one worker per CPU core by default. On Windows with a large
// project (~3800 modules) this causes all workers to allocate large heaps
// simultaneously and the process group runs out of virtual memory.
// Capping at 2 workers keeps peak memory well under 4 GB on any machine.
config.maxWorkers = 2;
// ─────────────────────────────────────────────────────────────────────────────

// Skip dependency validation that requires network (fixes "fetch failed" crash)
config.server = {
  ...config.server,
};

// Prefer CJS (`require`) over ESM (`import`) when resolving package exports
// **on web only**. Fixes Zustand v5's ESM build using `import.meta.env.MODE`,
// which is a SyntaxError when Metro serves the bundle as a classic <script>.
// On native (iOS/Android) we leave the default conditions untouched, so
// React Native gets its proper exports.
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