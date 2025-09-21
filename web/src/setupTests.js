import '@testing-library/jest-dom';

beforeEach(() => {
  global.fetch = undefined;
});

afterEach(() => {
  jest.restoreAllMocks();
});
