module.exports = {
  extends: ['@bookflow/eslint-config/react'],
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  ignorePatterns: [
    '.eslintrc.cjs',
    'dist',
    'node_modules',
    'vite.config.ts',
    'postcss.config.js',
    'tailwind.config.js',
  ],
};
