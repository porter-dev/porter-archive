import * as Sentry from "@sentry/react";

type LogFunction = (error: Error) => void;
type LogFunctions = {
  [key in Sentry.Severity]: LogFunction;
};

const logFunctionBuilder = (scope: string, severity: Sentry.Severity) => (
  error: Error
) => {
  Sentry.withScope((sentryScope) => {
    sentryScope.setTag("scope", scope);
    sentryScope.setLevel(severity);

    Sentry.captureException(error);
  });
};

function buildLogger(scope: string = "global") {
  const logFunctions = Object.values(Sentry.Severity).reduce<LogFunctions>(
    (acc, currentSeverity) => {
      if (typeof currentSeverity === "string") {
        acc[currentSeverity] = logFunctionBuilder(
          scope,
          Sentry.Severity.fromString(currentSeverity)
        );
      }

      return acc;
    },
    {} as LogFunctions
  );

  return logFunctions;
}

export default buildLogger;
