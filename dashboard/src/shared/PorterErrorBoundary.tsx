import UnexpectedErrorPage from "components/UnexpectedErrorPage";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import * as Sentry from "@sentry/react";
import StackTrace from "stacktrace-js";

export type PorterErrorBoundaryProps<OnResetProps = {}> = {
  // Component or useful name to describe where the error boundary was setted
  errorBoundaryLocation: string;
  // Used in case the boundary shouldn't refresh but instead do other action
  onReset?: (props: OnResetProps) => unknown;
};

const PorterErrorBoundary: React.FC<PorterErrorBoundaryProps> = ({
  errorBoundaryLocation,
  onReset,
  children,
}) => {
  const handleError = (err: Error, info: { componentStack: string }) => {
    StackTrace.fromError(err).then((error) => {
      if (process.env.ENABLE_SENTRY) {
        Sentry.captureException(error, (scope) => {
          scope.setTags({
            error_boundary_location: errorBoundaryLocation,
            error_message: err?.message,
            component_stack: info?.componentStack,
          });
          return scope;
        });
      }

      window?.analytics?.track("React Error", {
        location: errorBoundaryLocation,
        error: error.toString(),
        componentStack: info?.componentStack,
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
