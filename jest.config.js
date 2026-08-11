export default {
  testEnvironment: 'jsdom',
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  },
  moduleFileExtensions: ["js", "jsx"],
  setupFilesAfterEnv: [
    "<rootDir>/jest.setup.js"
  ],
  moduleNameMapper: {
    "\\.(png|PNG|jpg|jpeg|gif|svg)$": "<rootDir>/__mocks__/fileMock.js",
    "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.js",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^../lib/supabase-client$": "<rootDir>/__mocks__/supabase.js",
    "^../../lib/supabase-client$": "<rootDir>/__mocks__/supabase.js",
    "^../../../lib/supabase-client$": "<rootDir>/__mocks__/supabase.js"
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/*.test.{js,jsx}',
    '!src/**/__tests__/**'
  ],
  testMatch: [
    "**/__tests__/**/*.(test|spec).js?(x)",
    "**/*.(test|spec).js?(x)"
  ]
};
