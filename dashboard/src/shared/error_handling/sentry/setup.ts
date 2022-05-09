import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";
import CohereSentry from "cohere-sentry";

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENV = process.env.SENTRY_ENV || "development";
const COHERE_INTEGRATION = process.env.ENABLE_COHERE
  ? [new CohereSentry()]
  : [];

export const SetupSentry = () => {
  if (!SENTRY_DSN) {
    return;
  }
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [new Integrations.BrowserTracing(), ...COHERE_INTEGRATION],
    environment: SENTRY_ENV,
    // Check out https://docs.sentry.io/platforms/javascript/guides/react/configuration/sampling/ for a more refined sample rate
    tracesSampleRate: 1,
  });
};
