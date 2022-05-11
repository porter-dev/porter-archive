import * as Sentry from "@sentry/react";
import Cohere from "cohere-js";
import { isEmpty } from "lodash";

type LogFunction = (error: Error, tags?: { [key: string]: string }) => void;
type LogFunctions = {
  [key in Sentry.Severity]: LogFunction;
};

type LogFunctionBuilder = (
  scope: string,
  severity: Sentry.Severity
) => LogFunction;

const logFunctionBuilder: LogFunctionBuilder = (scope, severity) => (
  error,
  tags
) => {
  if (process.env.ENABLE_COHERE) {
    Cohere.getSessionUrl((sessionUrl) => {
      Sentry.withScope((sentryScope) => {
        sentryScope.setTag("scope", scope);
        sentryScope.setTag("cohere_link", sessionUrl);
        sentryScope.setLevel(severity);

        if (!isEmpty(tags)) {
          sentryScope.setTags(tags);
        }

        Sentry.captureException(error);
      });
    });
  } else {
    Sentry.withScope((sentryScope) => {
      sentryScope.setTag("scope", scope);
      sentryScope.setLevel(severity);

      if (!isEmpty(tags)) {
        sentryScope.setTags(tags);
      }

      Sentry.captureException(error);
    });
  }
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
