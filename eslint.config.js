// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/** Imports the library must never use (ADR-0001, ADR-0002). */
const libraryRestrictedImports = {
  paths: [
    { name: 'rxjs', message: 'No RxJS in library code (ADR-0001). Use signals.' },
    {
      name: '@angular/core/rxjs-interop',
      message: 'No RxJS in library code (ADR-0001). Use signals.',
    },
    {
      name: '@angular/forms',
      message: 'No reactive or template-driven forms. Use @angular/forms/signals only.',
    },
  ],
  patterns: [
    { group: ['rxjs/*'], message: 'No RxJS in library code (ADR-0001). Use signals.' },
    {
      group: ['@jsonforms/angular', '@jsonforms/angular-*'],
      message: 'Build on @jsonforms/core only (ADR-0001).',
    },
    {
      group: ['@spartan-ng/helm', '@spartan-ng/helm/*'],
      message: 'Helm is vendored in src/lib/ui/ (ADR-0002). Import it by relative path.',
    },
  ],
};

module.exports = defineConfig([
  {
    ignores: ['dist/', 'out-tsc/', 'coverage/', '.angular/'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='ChangeDetectionStrategy'][property.name='Eager']",
          message: 'Components are OnPush (the Angular 22 default). Do not opt into Eager.',
        },
      ],
    },
  },
  {
    // Tests walk field trees by dynamic keys, which the FieldTree types can't express.
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
  },
  {
    files: ['projects/jsonforms-spartan/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', libraryRestrictedImports],
    },
  },
  {
    files: ['projects/jsonforms-spartan/core/**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'jf', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'jf', style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['projects/jsonforms-spartan/src/**/*.ts'],
    ignores: ['projects/jsonforms-spartan/src/lib/ui/**'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'jfs', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'jfs', style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['projects/demo/src/app/**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
    },
  },
]);
