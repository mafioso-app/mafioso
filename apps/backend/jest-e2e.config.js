/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.e2e-spec.ts'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^@mafioso/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@mafioso/engine$': '<rootDir>/../../packages/engine/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
}
