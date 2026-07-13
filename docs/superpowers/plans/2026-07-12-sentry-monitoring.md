# Sentry Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Report frontend failures to Sentry by environment while removing credentials and clinical data before transmission.

**Architecture:** A dedicated `observability` module owns all Sentry calls and accepts only deployment metadata. `main.jsx` initializes it once and `AppBoundary` reports React errors through its narrow API. This keeps the error UI independent of the monitoring provider.

**Tech Stack:** React 18, Vite 5, Jest 29, `@sentry/react`.

---

### Task 1: Add the observable and sanitization boundary

**Files:**
- Create: `src/lib/observability.js`
- Create: `src/lib/observability.test.js`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Write the failing tests for disabled initialization and sensitive-event filtering**

```js
import * as Sentry from '@sentry/react';
import { initializeObservability, reportException } from './observability';

jest.mock('@sentry/react', () => ({ init: jest.fn(), captureException: jest.fn() }));

test('does not initialize Sentry without a DSN', () => {
  initializeObservability({ dsn: '', environment: 'staging', release: 'abc' });
  expect(Sentry.init).not.toHaveBeenCalled();
});

test('removes sensitive values before reporting an exception', () => {
  initializeObservability({ dsn: 'https://key@example.ingest.sentry.io/1', environment: 'staging', release: 'abc' });
  reportException(new Error('fallo'), {
    componentStack: 'at Captura',
    request: { headers: { Authorization: 'Bearer secret' }, data: { password: 'secret' } },
  });
  expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
    contexts: { react: { componentStack: 'at Captura' } },
  }));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/observability.test.js --runInBand`

Expected: FAIL because `./observability` does not exist.

- [ ] **Step 3: Install the SDK**

Run: `npm install @sentry/react`

Expected: `package.json` and `package-lock.json` contain `@sentry/react`.

- [ ] **Step 4: Implement the minimal observability module**

```js
import * as Sentry from '@sentry/react';

const stripSensitiveEvent = (event) => ({
  ...event,
  request: undefined,
  user: undefined,
  extra: undefined,
  breadcrumbs: undefined,
});

const safeReactContext = (context) =>
  context?.componentStack ? { react: { componentStack: context.componentStack } } : undefined;

export const initializeObservability = ({ dsn, environment, release }) => {
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment,
    release,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: stripSensitiveEvent,
  });
  return true;
};

export const reportException = (error, context) =>
  Sentry.captureException(error, { contexts: safeReactContext(context) });
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/observability.test.js --runInBand`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/observability.js src/lib/observability.test.js
git commit -m "feat: add privacy-safe Sentry observability"
```

### Task 2: Initialize Sentry and connect the React boundary

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/components/app-boundary.jsx`
- Create: `src/components/app-boundary.test.jsx`

- [ ] **Step 1: Write the failing boundary test**

```jsx
import { render } from '@testing-library/react';
import AppBoundary from './app-boundary';
import { reportException } from '../lib/observability';

jest.mock('../lib/observability', () => ({ reportException: jest.fn() }));

test('reports a React render error without exposing component data to the UI', () => {
  const Broken = () => { throw new Error('boom'); };
  render(<AppBoundary><Broken /></AppBoundary>);
  expect(reportException).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ componentStack: expect.any(String) }));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/app-boundary.test.jsx --runInBand`

Expected: FAIL because the boundary does not call `reportException`.

- [ ] **Step 3: Initialize from Vite variables and report captured boundary errors**

```jsx
// src/main.jsx
import { initializeObservability } from './lib/observability';

initializeObservability({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE,
  release: import.meta.env.VERCEL_GIT_COMMIT_SHA,
});

// src/components/app-boundary.jsx
import { reportException } from '../lib/observability';

componentDidCatch(error, info) {
  this.setState({ info });
  reportException(error, { componentStack: info?.componentStack });
  console.error('[ErrorBoundary]', error, info?.componentStack);
}
```

- [ ] **Step 4: Run the focused tests**

Run: `npm test -- src/lib/observability.test.js src/components/app-boundary.test.jsx --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main.jsx src/components/app-boundary.jsx src/components/app-boundary.test.jsx
git commit -m "feat: report application boundary errors to Sentry"
```

### Task 3: Document deployment configuration and verify the integration

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the exact Vercel environment variables**

```markdown
## Sentry

Set `VITE_SENTRY_DSN` and `VITE_APP_ENV=staging` for the staging branch.
Set `VITE_SENTRY_DSN` and `VITE_APP_ENV=production` for Production. Use
separate Sentry projects or environment filters. Do not enable Session Replay,
network body collection, or send source-map tokens to the browser.
```

- [ ] **Step 2: Run the complete unit suite and production build**

Run: `npm test -- --runInBand && npm run build`

Expected: tests pass and Vite emits `dist/`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document Sentry environment configuration"
```
