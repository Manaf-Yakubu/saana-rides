import base from '@saana/config/eslint';
import globals from 'globals';

export default [...base, { languageOptions: { globals: { ...globals.browser } } }];
