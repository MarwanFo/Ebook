module.exports = {
  extends: ['./base.js', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  plugins: ['react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@bookflow/api',
            message:
              'Frontend (apps/web) must never import from backend (apps/api). Use @bookflow/shared-types.',
          },
          {
            name: '@prisma/client',
            message:
              'Frontend (apps/web) must never import database ORM (@prisma/client). Use @bookflow/shared-types.',
          },
        ],
        patterns: [
          {
            group: ['@nestjs/*', '../*apps/api*'],
            message: 'Frontend must not import NestJS or backend API internals.',
          },
        ],
      },
    ],
  },
  env: {
    browser: true,
    es2022: true,
  },
};
