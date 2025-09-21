module.exports = {
  projects: [
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/**/*.test.js'],
      transform: {
        '^.+\\.[jt]sx?$': 'babel-jest'
      },
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      }
    },
    {
      displayName: 'web',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/web/src/**/*.test.jsx'],
      setupFilesAfterEnv: ['<rootDir>/web/src/setupTests.js'],
      transform: {
        '^.+\\.[jt]sx?$': 'babel-jest'
      },
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      }
    }
  ]
};
