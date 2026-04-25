module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'react' }],
    ],
    plugins: [
      // Tamagui's babel plugin statically extracts styles at build time so the
      // RN tree doesn't pay runtime cost for every styled component. It also
      // flattens nested <YStack>/<XStack> into RN <View>s with style objects.
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './tamagui.config.ts',
          logTimings: true,
        },
      ],
      // react-native-reanimated must be last.
      'react-native-reanimated/plugin',
    ],
  }
}
