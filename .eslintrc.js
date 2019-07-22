module.exports = {
  parser: '@typescript-eslint/parser',

  parserOptions: {
    project: 'tsconfig.json',
  },

  extends: [
    'plugin:node/recommended',
    'plugin:security/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'prettier/@typescript-eslint',
  ],

  env: {
    es6: true,
    node: true,
  },

  rules: {
    // Typescript rules found here:
    // https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin#supported-rules
    '@typescript-eslint/camelcase': ['error', { properties: 'never' }],
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    'node/no-unsupported-features/es-syntax': ['error', { ignores: ['modules'] }],
  },

  overrides: [
    {
      files: ['__tests__/*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'node/no-missing-require': 'off',
      },
    },
  ],
};
