import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const reactCompilerRuleOverrides = Object.fromEntries(
  Object.keys(reactHooks.configs.recommended.rules)
    .filter((ruleName) => ruleName !== 'react-hooks/rules-of-hooks')
    .map((ruleName) => [ruleName, 'warn']),
)

export default defineConfig([
  globalIgnores([
    'dist',
    'node_modules',
    '.tmp',
    'supabase/migrations',
    '**/*.{test,spec}.{js,jsx}',
    'jest.setup.js',
    '__mocks__/**',
  ]),
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...reactCompilerRuleOverrides,
      ...reactRefresh.configs.vite.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-empty': 'warn',
      'no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^[A-Z_]',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.js', 'vite.config.js', 'jest.config.js', 'babel.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
])
