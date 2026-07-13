import React from 'react';
import { render, screen } from '@testing-library/react';
import AppBoundary from './app-boundary';
import { reportException } from '../lib/observability';

jest.mock('../lib/observability', () => ({
  reportException: jest.fn(),
}));

const BrokenScreen = () => {
  throw new Error('boom');
};

describe('AppBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('reports a render error with only its React component stack', () => {
    render(
      <AppBoundary>
        <BrokenScreen />
      </AppBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(reportException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });
});
