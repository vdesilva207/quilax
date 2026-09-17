module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo already injects the worklets/reanimated plugin when present.
    presets: ['babel-preset-expo'],
    plugins: [],
  };
};
