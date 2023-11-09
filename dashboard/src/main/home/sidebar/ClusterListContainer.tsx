import React, { useContext } from "react";

import { Context } from "shared/Context";

import ClusterList from "./ClusterList";

const ClusterListContainer = (): JSX.Element => {
  const context = useContext(Context);

  return (
    <ClusterList
      currentProject={context.currentProject}
      projects={context.projects}
    />
  );
};

export default ClusterListContainer;
