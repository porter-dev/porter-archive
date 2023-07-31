import React, { useContext } from "react";

import { Context } from "shared/Context";
import ClusterPlaceholder from "./ClusterPlaceholder";

type PropsType = {};

const ClusterPlaceholderContainer: React.FC<PropsType> = () => {
  const context = useContext(Context);

  return <ClusterPlaceholder currentCluster={context.currentCluster} />;
}

export default ClusterPlaceholderContainer;
