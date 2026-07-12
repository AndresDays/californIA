import * as Sentry from '@sentry/react';

const stripSensitiveEventData = (event) => ({
  ...event,
  request: undefined,
  user: undefined,
  extra: undefined,
  breadcrumbs: undefined,
});

const getSafeReactContext = (context) => (
  context?.componentStack
    ? { react: { componentStack: context.componentStack } }
    : undefined
);

export const initializeObservability = ({ dsn, environment, release }) => {
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment,
    release,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: stripSensitiveEventData,
  });

  return true;
};

export const reportException = (error, context) => (
  Sentry.captureException(error, {
    contexts: getSafeReactContext(context),
  })
);
