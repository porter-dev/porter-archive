import UnexpectedErrorPage from "components/UnexpectedErrorPage";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";

const PorterErrorBoundary: React.FC = ({ children }) => {
  const handleError = (error: Error, info: { componentStack: string }) => {
    window?.analytics?.track("React error", {
      location: "global-error-boundary",
      error: error.message,
      componentStack: info?.componentStack,
      url: window.location.toString(),
    });
    window.location.reload();
  };

  return (
    <ErrorBoundary
      FallbackComponent={UnexpectedErrorPage}
      onReset={handleError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default PorterErrorBoundary;
