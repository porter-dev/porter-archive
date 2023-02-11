import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENV = process.env.SENTRY_ENV || "development";

export const SetupSentry = () => {
  if (!SENTRY_DSN) {
    return;
  }
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [new Integrations.BrowserTracing()],
    environment: SENTRY_ENV,
    // Check out https://docs.sentry.io/platforms/javascript/guides/react/configuration/sampling/ for a more refined sample rate
    tracesSampleRate: 1,
  });
};
