import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import globals from 'globals'

/**
 * Flat config, replacing .eslintrc.cjs and .eslintignore.
 *
 * ESLint 10 does not read either of those — eslintrc is gone and ignores live here now — so
 * this is a port rather than a rewrite, and it is meant to lint exactly what the old pair
 * linted. A config that quietly stops enforcing a rule still exits 0, which looks like
 * success, so the equivalence was checked against a deliberately broken file rather than
 * assumed from a green run.
 *
 * Old -> new mapping, one line each:
 *
 *   plugin:vue/vue3-essential   -> pluginVue.configs['flat/essential']
 *   eslint:recommended          -> js.configs.recommended
 *   @vue/typescript/recommended -> vueTsConfigs.recommended
 *   env: { node: true }         -> languageOptions.globals
 *   .eslintignore               -> the ignores block below
 */
export default defineConfigWithVueTs(
  // Must be its own object with nothing else in it — that is what makes it global rather
  // than a rule applying to one set of files.
  {
    ignores: [
      '**/.DS_Store',
      'coverage/**',
      'dist/**',
      'ios/**',
      'android/**',
      '**/*.local',
      '**/*-debug.log*',
      '.idea/**',
      '.vscode/**',
      // Handoff bundles are dropped in the repo root to be diffed against, not built. They
      // are deliberately partial and often written from an older snapshot, so linting them
      // fails CI over code that was never applied — which is how aug17 broke a green run.
      'handoff-*/**',
    ],
  },

  js.configs.recommended,
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  {
    languageOptions: {
      // The old config declared only `env: { node: true }` and got away with it because the
      // TypeScript preset turns `no-undef` off — TypeScript already catches an unknown
      // global, and better. Browser globals are declared anyway: this is a browser app, and
      // relying on a disabled rule to hide a missing declaration is a trap for whoever
      // enables it later.
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'vue/no-deprecated-slot-attribute': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // A leading underscore is how this codebase already says "deliberately unused" — an
      // argument kept to satisfy a signature, for instance. Honour that rather than making
      // people delete a parameter they need to keep.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
)
