module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: ['standard'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  globals: {
    Bot: true,
    redis: true,
    logger: true,
    plugin: true,
    segment: true,
  },
  rules: {
    eqeqeq: ['off'],
    'prefer-const': ['off'],
    'arrow-body-style': 'off',
    camelcase: 'off',
    'quote-props': ['error', 'consistent'],
    'no-eval': ['error', { allowIndirect: true }],
  },
}
