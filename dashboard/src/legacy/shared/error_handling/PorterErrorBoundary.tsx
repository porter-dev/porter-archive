import React from "react";
import * as Sentry from "@sentry/react";
import { type Context, type Primitive } from "@sentry/types";
import UnexpectedErrorPage from "legacy/components/UnexpectedErrorPage";
import { ErrorBoundary } from "react-error-boundary";
import StackTrace from "stacktrace-js";

import { stackFramesToString } from "./stack_trace_utils";

export type PorterErrorBoundaryProps<OnResetProps = {}> = {
  // Component or useful name to describe where the error boundary was setted
  errorBoundaryLocation: string;
  // Used in case the boundary shouldn't refresh but instead do other action
  onReset?: (props: OnResetProps) => unknown;
  // Add more tags to sentry errors
  tags?: Record<string, Primitive>;
  // Add more context for sentry errors
  context?: Record<string, Context>;
};

const PorterErrorBoundary: React.FC<PorterErrorBoundaryProps> = ({
  errorBoundaryLocation,
  onReset,
  children,
  tags,
  context,
}) => {
  const handleError = (err: Error) => {
    StackTrace.fromError(err).then((stackframes) => {
      const stackFramesStringify = stackFramesToString(stackframes);
      // Preserve the old stack just in case
      const originalStack = err.stack;
      // Update the error stack with the StackTrace stack (this helps for minified environments)
      err.stack = stackFramesStringify;

      if (import.meta.env.ENABLE_SENTRY) {
        Sentry.captureException(err, (scope) => {
          scope.setTags({
            error_boundary_location: errorBoundaryLocation,
            error_message: err?.message,
            ...(tags || {}),
          });
          scope.setContext("Original stack", {
            originalStack,
          });

          if (typeof context === "object") {
            Object.entries(context).forEach(([contextName, contextContent]) => {
              scope.setContext(contextName, contextContent);
            });
          }

          return scope;
        });
      }

      window?.analytics?.track("React Error", {
        location: errorBoundaryLocation,
        error: stackFramesStringify,
        componentStack: err.stack,
        url: window.location.toString(),
      });
    });
  };

  const handleOnReset = (props: unknown) => {
    typeof onReset === "function" ? onReset(props) : window.location.reload();
  };

  return (
    <ErrorBoundary
      onError={handleError}
      FallbackComponent={UnexpectedErrorPage}
      onReset={handleOnReset}
    >
      {children}
    </ErrorBoundary>
  );
};

export default PorterErrorBoundary;
