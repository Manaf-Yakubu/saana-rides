import base from '@saana/config/eslint';
import globals from 'globals';

export default [
  { ignores: ['next-env.d.ts'] },
  ...base,
  { languageOptions: { globals: { ...globals.browser } } },
];
