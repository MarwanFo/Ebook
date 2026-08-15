module.exports = {
  extends: ['@bookflow/eslint-config'],
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@prisma/client',
            message:
              'Shared types must remain pure API contracts and cannot import @prisma/client.',
          },
          {
            name: '@bookflow/api',
            message: 'Shared types cannot import from apps/api.',
          },
          {
            name: '@bookflow/web',
            message: 'Shared types cannot import from apps/web.',
          },
        ],
        patterns: [
          {
            group: ['@nestjs/*', '../*apps/*'],
            message:
              'Shared types cannot depend on backend frameworks or application code.',
          },
        ],
      },
    ],
  },
  ignorePatterns: ['.eslintrc.cjs', 'dist', 'node_modules'],
};
