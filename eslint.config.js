import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/', 'tests/tmp*/', 'tests/gpu/tmp*'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.js'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Numerical code reads more clearly with `${x}` on numbers in messages.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // tsconfig enables noUncheckedIndexedAccess, so every typed-array read
      // is `number | undefined`. Numerical loops index within bounds they
      // compute themselves; `a[i]!` states that clearly, whereas `a[i] ?? NaN`
      // everywhere would obscure the arithmetic. Out-of-range reads are
      // caught by the tests and by the NaN/positivity checks in the solvers.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
