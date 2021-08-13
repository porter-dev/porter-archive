import UnexpectedErrorPage from "components/UnexpectedErrorPage";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";

export type PorterErrorBoundaryProps<OnResetProps = {}> = {
  errorBoundaryLocation: string;
  onReset?: (props: OnResetProps) => unknown;
};

const PorterErrorBoundary: React.FC<PorterErrorBoundaryProps> = ({
  errorBoundaryLocation,
  onReset,
  children,
}) => {
  const handleError = (error: Error, info: { componentStack: string }) => {
    window?.analytics?.track("React Error", {
      location: errorBoundaryLocation,
      error: error.message,
      componentStack: info?.componentStack,
      url: window.location.toString(),
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
