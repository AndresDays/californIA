import * as Sentry from '@sentry/react';
import { initializeObservability, reportException } from './observability';

jest.mock('@sentry/react', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

describe('observability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not initialize Sentry without a DSN', () => {
    expect(initializeObservability({ dsn: '', environment: 'staging', release: 'abc' })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  test('reports only the React component stack as context', () => {
    initializeObservability({
      dsn: 'https://key@example.ingest.sentry.io/1',
      environment: 'staging',
      release: 'abc',
    });

    const error = new Error('fallo');
    reportException(error, {
      componentStack: 'at Captura',
      request: { headers: { Authorization: 'Bearer secret' }, data: { password: 'secret' } },
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      contexts: { react: { componentStack: 'at Captura' } },
    });
  });

  test('removes request, user, extra, and breadcrumbs from outgoing events', () => {
    initializeObservability({
      dsn: 'https://key@example.ingest.sentry.io/1',
      environment: 'production',
      release: 'abc',
    });

    const options = Sentry.init.mock.calls[0][0];
    const sanitized = options.beforeSend({
      request: { headers: { Authorization: 'Bearer secret' } },
      user: { email: 'paciente@example.com' },
      extra: { reporte: 'dato clinico' },
      breadcrumbs: [{ message: 'dato clinico' }],
      tags: { route: '/captura' },
    });

    expect(sanitized).toEqual({ tags: { route: '/captura' } });
  });
});
