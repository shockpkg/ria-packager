import eslint from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import unicorn from 'eslint-plugin-unicorn';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
	eslint.configs.recommended,
	jsdoc.configs['flat/recommended'],
	unicorn.configs['flat/recommended'],
	{
		plugins: {
			'@stylistic': stylistic
		}
	},
	...tseslint.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				project: './tsconfig.eslint.json'
			}
		}
	},
	prettier,
	{
		rules: {
			// Possible Errors:
			'no-await-in-loop': 'error',
			'no-console': 'error',
			'no-loss-of-precision': 'error',
			'no-template-curly-in-string': 'error',
			'no-unreachable': 'error',

			// Best Practices:
			'accessor-pairs': 'error',
			'array-callback-return': 'error',
			'block-scoped-var': 'error',
			'consistent-return': 'error',
			'default-case': 'error',
			eqeqeq: 'error',
			'guard-for-in': 'error',
			'max-classes-per-file': ['error', 1],
			'no-alert': 'error',
			'no-caller': 'error',
			'no-div-regex': 'error',
			'no-else-return': 'error',
			'no-eq-null': 'error',
			'no-eval': 'error',
			'no-extend-native': 'error',
			'no-extra-bind': 'error',
			'no-extra-label': 'error',
			'no-floating-decimal': 'error',
			'no-implicit-globals': 'error',
			'no-implied-eval': 'error',
			'no-invalid-this': 'error',
			'no-iterator': 'error',
			'no-labels': [
				'error',
				{
					allowLoop: true,
					allowSwitch: true
				}
			],
			'no-lone-blocks': 'error',
			'no-loop-func': 'error',
			'no-multi-str': 'error',
			'no-new': 'error',
			'no-new-func': 'error',
			'no-new-wrappers': 'error',
			'no-octal-escape': 'error',
			'no-proto': 'error',
			'no-return-assign': 'error',
			'no-return-await': 'error',
			'no-script-url': 'error',
			'no-self-compare': 'error',
			'no-sequences': 'error',
			'no-throw-literal': 'error',
			'no-unmodified-loop-condition': 'error',
			'no-unused-expressions': 'error',
			'no-useless-call': 'error',
			'no-useless-concat': 'error',
			'no-void': 'error',
			'no-warning-comments': 'warn',
			radix: 'error',
			'wrap-iife': ['error', 'inside'],
			yoda: 'error',

			// Strict Mode:
			strict: ['error', 'global'],

			// Variables:
			'no-label-var': 'error',
			'no-undef-init': 'error',
			'no-undefined': 'error',
			// Using @typescript-eslint/no-unused-vars
			'no-unused-vars': 'off',

			// Node.js and CommonJS:
			'callback-return': ['error', ['callback', 'cb', 'next', 'done']],
			'global-require': 'error',
			'handle-callback-err': 'error',
			'no-buffer-constructor': 'error',
			'no-mixed-requires': 'error',
			'no-new-require': 'error',
			'no-path-concat': 'error',
			'no-process-env': 'error',
			'no-process-exit': 'error',
			'no-sync': 'error',

			// Stylistic Issues:
			'array-bracket-spacing': [
				'error',
				'never',
				{
					singleValue: false,
					objectsInArrays: false,
					arraysInArrays: false
				}
			],
			'func-name-matching': [
				'error',
				'always',
				{
					includeCommonJSModuleExports: false
				}
			],
			'line-comment-position': [
				'error',
				{
					position: 'above'
				}
			],
			'lines-between-class-members': ['error', 'always'],
			'max-depth': ['error', 6],
			'max-len': [
				'error',
				80,
				4,
				{
					ignoreComments: false,
					ignoreUrls: true,
					ignorePattern: /^\s*(\/\/|\/\*)\s*eslint/.source
				}
			],
			'max-nested-callbacks': ['error', 4],
			'max-params': ['error', 8],
			'new-cap': 'error',
			'no-bitwise': 'error',
			'no-inline-comments': 'error',
			'no-lonely-if': 'error',
			'no-negated-condition': 'error',
			'no-nested-ternary': 'error',
			'no-new-object': 'error',
			'no-unneeded-ternary': [
				'error',
				{
					defaultAssignment: false
				}
			],
			'one-var': ['error', 'never'],
			'spaced-comment': ['error', 'always'],
			'unicode-bom': ['error', 'never'],

			// ECMAScript 6:
			'arrow-body-style': ['error', 'as-needed'],
			'no-confusing-arrow': [
				'error',
				{
					allowParens: true
				}
			],
			'no-duplicate-imports': [
				'error',
				{
					includeExports: false
				}
			],
			'no-useless-computed-key': 'error',
			'no-useless-rename': [
				'error',
				{
					ignoreDestructuring: false,
					ignoreImport: false,
					ignoreExport: false
				}
			],
			'no-var': 'error',
			'object-shorthand': ['error', 'always'],
			'prefer-arrow-callback': [
				'error',
				{
					allowNamedFunctions: false,
					allowUnboundThis: true
				}
			],
			'prefer-const': 'error',
			'prefer-destructuring': 'error',
			'prefer-numeric-literals': 'error',
			'prefer-rest-params': 'error',
			'prefer-spread': 'error',
			'prefer-template': 'error',
			'symbol-description': 'error',

			// Import plugin:
			// 'import/no-deprecated': 'warn',
			// 'import/no-extraneous-dependencies': [
			// 	'error',
			// 	{
			// 		devDependencies: true,
			// 		optionalDependencies: true,
			// 		peerDependencies: true
			// 	}
			// ],
			// 'import/no-unassigned-import': 'error',
			// 'import/order': [
			// 	'warn',
			// 	{
			// 		'newlines-between': 'always'
			// 	}
			// ],

			// Unicorn plugin:
			'unicorn/catch-error-name': 'off',
			'unicorn/explicit-length-check': 'off',
			'unicorn/import-style': 'off',
			'unicorn/no-anonymous-default-export': 'off',
			'unicorn/no-array-callback-reference': 'off',
			'unicorn/no-await-expression-member': 'off',
			'unicorn/no-hex-escape': 'off',
			'unicorn/no-null': 'off',
			'unicorn/no-unreadable-array-destructuring': 'off',
			'unicorn/numeric-separators-style': 'off',
			'unicorn/prefer-string-replace-all': 'off',
			'unicorn/prefer-top-level-await': 'off',
			'unicorn/prevent-abbreviations': 'off',
			'unicorn/switch-case-braces': 'off',

			// Stylistic plugin:
			'@stylistic/lines-around-comment': [
				'error',
				{
					beforeBlockComment: true,
					allowBlockStart: true,
					allowObjectStart: true,
					allowArrayStart: true,
					allowEnumStart: true,
					allowInterfaceStart: true,
					allowModuleStart: true,
					allowTypeStart: true
				}
			],
			'@stylistic/member-delimiter-style': 'error',

			// JSDoc plugin:
			'jsdoc/check-indentation': 'warn',
			'jsdoc/check-syntax': 'warn',
			'jsdoc/match-description': [
				'warn',
				{
					tags: {
						param: true,
						returns: true
					}
				}
			],
			'jsdoc/no-types': 'warn',
			'jsdoc/require-description': 'warn',
			'jsdoc/require-description-complete-sentence': [
				'warn',
				{
					tags: ['see', 'copyright']
				}
			],
			'jsdoc/require-param-type': 'off',
			'jsdoc/require-returns-type': 'off',
			'jsdoc/require-jsdoc': [
				'warn',
				{
					require: {
						ArrowFunctionExpression: true,
						ClassDeclaration: true,
						ClassExpression: true,
						FunctionDeclaration: true,
						FunctionExpression: true,
						MethodDefinition: true
					},
					checkGetters: true,
					checkSetters: true
				}
			],
			'jsdoc/tag-lines': [
				'warn',
				'never',
				{
					startLines: 1
				}
			],

			// TypeScript Simple:
			'@typescript-eslint/array-type': 'error',
			'@typescript-eslint/consistent-type-assertions': 'error',
			'@typescript-eslint/consistent-type-definitions': 'error',
			'@typescript-eslint/explicit-member-accessibility': [
				'error',
				{
					overrides: {
						constructors: 'no-public'
					}
				}
			],
			'@typescript-eslint/member-ordering': [
				'error',
				{
					default: [
						'public-static-field',
						'private-static-field',
						'public-instance-field',
						'private-instance-field',
						'public-constructor',
						'private-constructor',
						'public-instance-method',
						'protected-instance-method',
						'private-instance-method'
					]
				}
			],
			'@typescript-eslint/no-require-imports': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					vars: 'all',
					args: 'none'
				}
			],
			'@typescript-eslint/no-use-before-define': ['error', 'nofunc'],
			'@typescript-eslint/prefer-for-of': 'error',
			'@typescript-eslint/prefer-function-type': 'error',
			'@typescript-eslint/unified-signatures': 'error',
			'@typescript-eslint/no-confusing-non-null-assertion': 'error',

			// TypeScript Project:
			'@typescript-eslint/no-unnecessary-qualifier': 'error',
			'@typescript-eslint/prefer-includes': 'error',
			'@typescript-eslint/prefer-readonly': 'error',
			'@typescript-eslint/prefer-string-starts-ends-with': 'error',
			'@typescript-eslint/promise-function-async': 'error',
			'@typescript-eslint/no-unnecessary-boolean-literal-compare': [
				'error',
				{
					allowComparingNullableBooleansToTrue: true,
					allowComparingNullableBooleansToFalse: true
				}
			],
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'default',
					format: ['camelCase']
				},
				{
					selector: 'typeLike',
					format: ['PascalCase']
				},
				{
					selector: 'interface',
					format: ['PascalCase']
				},
				{
					selector: 'variable',
					format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
					leadingUnderscore: 'allow',
					trailingUnderscore: 'allow'
				},
				{
					selector: 'parameter',
					format: ['camelCase', 'PascalCase'],
					leadingUnderscore: 'allow'
				},
				{
					selector: 'class',
					format: ['PascalCase']
				},
				{
					selector: 'memberLike',
					modifiers: ['public'],
					format: ['camelCase', 'PascalCase']
				},
				{
					selector: 'memberLike',
					modifiers: ['protected'],
					format: ['camelCase', 'PascalCase'],
					leadingUnderscore: 'require'
				},
				{
					selector: 'memberLike',
					modifiers: ['private'],
					format: ['camelCase', 'PascalCase'],
					leadingUnderscore: 'require',
					trailingUnderscore: 'require'
				},
				{
					selector: 'memberLike',
					modifiers: ['public', 'readonly', 'static'],
					format: ['UPPER_CASE']
				},
				{
					selector: 'memberLike',
					modifiers: ['protected', 'readonly', 'static'],
					format: ['UPPER_CASE'],
					leadingUnderscore: 'require'
				},
				{
					selector: 'memberLike',
					modifiers: ['private', 'readonly', 'static'],
					format: ['UPPER_CASE'],
					leadingUnderscore: 'require',
					trailingUnderscore: 'require'
				},
				{
					selector: 'accessor',
					modifiers: ['public'],
					format: [
						'camelCase',
						'PascalCase',
						'snake_case',
						'UPPER_CASE'
					]
				},
				{
					selector: 'accessor',
					modifiers: ['protected'],
					format: [
						'camelCase',
						'PascalCase',
						'snake_case',
						'UPPER_CASE'
					],
					leadingUnderscore: 'require'
				},
				{
					selector: 'accessor',
					modifiers: ['private'],
					format: [
						'camelCase',
						'PascalCase',
						'snake_case',
						'UPPER_CASE'
					],
					leadingUnderscore: 'require',
					trailingUnderscore: 'require'
				},
				{
					selector: 'accessor',
					modifiers: ['public', 'static'],
					format: [
						'camelCase',
						'PascalCase',
						'snake_case',
						'UPPER_CASE'
					]
				},
				{
					selector: 'accessor',
					modifiers: ['protected', 'static'],
					format: [
						'camelCase',
						'PascalCase',
						'snake_case',
						'UPPER_CASE'
					],
					leadingUnderscore: 'require'
				},
				{
					selector: 'accessor',
					modifiers: ['private', 'static'],
					format: [
						'camelCase',
						'PascalCase',
						'snake_case',
						'UPPER_CASE'
					],
					leadingUnderscore: 'require',
					trailingUnderscore: 'require'
				},
				{
					selector: 'property',
					format: [
						'camelCase',
						'PascalCase',
						'snake_case',
						'UPPER_CASE'
					],
					leadingUnderscore: 'allow',
					trailingUnderscore: 'allow'
				}
			]
		}
	},
	{
		files: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.mjsx'],
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off'
		}
	},
	{
		files: ['**/*.ts', '**/*.tsx'],
		rules: {
			'jsdoc/no-types': 'warn'
		}
	},
	{
		files: [
			'**/*.test.js',
			'**/*.test.jsx',
			'**/*.test.mjs',
			'**/*.test.mjsx',
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.js',
			'**/*.spec.jsx',
			'**/*.spec.mjs',
			'**/*.spec.mjsx',
			'**/*.spec.ts',
			'**/*.spec.tsx'
		],
		rules: {
			'no-void': 'off',
			'jsdoc/require-jsdoc': 'off',
			'@typescript-eslint/no-floating-promises': [
				'error',
				{
					ignoreVoid: true
				}
			]
		}
	},
	{
		files: ['babel.config.mjs', 'eslint.config.mjs'],
		rules: {
			'jsdoc/require-jsdoc': 'off',
			'@typescript-eslint/naming-convention': 'off'
		}
	},
	{
		ignores: ['dts', 'esm', 'cjs']
	}
];
