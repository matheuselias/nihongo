module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // drizzle-kit's expo driver emits migrations.js importing .sql files as strings
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
