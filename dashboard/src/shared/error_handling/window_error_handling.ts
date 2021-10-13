import { stackFramesToString } from "./stack_trace_utils";
import StackTrace from "stacktrace-js";
import * as Sentry from "@sentry/react";

export function EnableErrorHandling() {
  window.onerror = function (msg, file, line, col, err) {
    StackTrace.fromError(err).then((stackframes) => {
      const stackFramesStringify = stackFramesToString(stackframes);
      // Preserve the old stack just in case
      const originalStack = err.stack;
      // Update the error stack with the StackTrace stack (this helps for minified environments)
      err.stack = stackFramesStringify;

      if (process.env.ENABLE_SENTRY) {
        Sentry.captureException(err, (scope) => {
          scope.setTags({
            error_boundary_location: "window_error_handling",
            error_message: err?.message,
          });
          scope.setContext("Original stack", {
            originalStack,
          });

          return scope;
        });
      }

      window?.analytics?.track("React Error", {
        location: "window_error_handling",
        error: stackFramesStringify,
        componentStack: err.stack,
        url: window.location.toString(),
      });
    });
  };
}
