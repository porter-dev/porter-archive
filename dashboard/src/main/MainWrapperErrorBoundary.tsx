import React, { useContext } from "react";
import { Context } from "shared/Context";
import PorterErrorBoundary from "shared/PorterErrorBoundary";

const MainWrapperErrorBoundary: React.FC = ({ children }) => {
  const location = "MainWrapperErrorBoundary";
  const {
    capabilities,
    currentCluster,
    currentProject,
    devOpsMode,
    projects,
  } = useContext(Context);

  return (
    <PorterErrorBoundary
      errorBoundaryLocation={location}
      context={{
        "Global context state": {
          capabilities,
          currentProject,
          currentCluster,
          devOpsMode,
          projects: JSON.stringify(projects),
        },
      }}
    >
      {children}
    </PorterErrorBoundary>
  );
};

export default MainWrapperErrorBoundary;
