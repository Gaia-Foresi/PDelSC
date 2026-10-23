module.exports = {
  root: true,
  env: { es2021: true, node: true },
  parserOptions: { ecmaVersion: 2021, sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['react', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:react/recommended'],
  settings: { react: { version: 'detect' } },
  globals: { __DEV__: 'readonly', fetch: 'readonly', AbortController: 'readonly', FileReader: 'readonly', Blob: 'readonly', document: 'readonly', window: 'readonly', localStorage: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', URL: 'readonly', console: 'readonly' },
  rules: {
    'react/prop-types': 'off',
    'react/display-name': 'off',
    'react/no-unescaped-entities': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
