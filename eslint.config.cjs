const nextPlugin = require('@next/eslint-plugin-next')
const tsParser = require('@typescript-eslint/parser')

const coreWebVitalsRules = nextPlugin.configs['core-web-vitals'].rules ?? {}

module.exports = [
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...coreWebVitalsRules,
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
  },
]
