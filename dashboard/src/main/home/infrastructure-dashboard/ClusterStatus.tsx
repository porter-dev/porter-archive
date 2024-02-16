import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import StatusDot from "components/porter/StatusDot";
import Text from "components/porter/Text";

import api from "shared/api";
import { Context } from "shared/Context";

import { useClusterContext } from "./ClusterContextProvider";

const ClusterStatus: React.FC = () => {
  const { currentProject } = useContext(Context);
  const { cluster } = useClusterContext();
  const [nodes, setNodes] = useState([]);

  const updateNodes = async (): Promise<void> => {
    try {
      const res = await api.getClusterNodes(
        "<token>",
        {},
        {
          project_id: currentProject?.id || -1,
          cluster_id: cluster.id,
        }
      );
      const filtered = res.data.filter((node: any) => {
        return node?.labels["porter.run/workload-kind"] === "application";
      });
      setNodes(filtered);
    } catch (err) {}
  };

  useEffect(() => {
    if (!currentProject || !cluster) {
      return;
    }
    void updateNodes();
  }, [currentProject, cluster]);

  return (
    <Container row style={{ flexShrink: 0 }}>
      <Spacer inline x={0.2} />
      <StatusDot
        status={cluster.status === "READY" ? "available" : "pending"}
        heightPixels={8}
      />
      <Spacer inline x={0.7} />
      {cluster.status === "READY" ? (
        <Text color="helper">
          Running {nodes.length}{" "}
          <Code>{nodes[0]?.labels["node.kubernetes.io/instance-type"]}</Code>{" "}
          instances
        </Text>
      ) : (
        <Text color="helper">Updating</Text>
      )}
    </Container>
  );
};

export default ClusterStatus;

const Code = styled.span`
  font-family: monospace;
  font-size: 12px;
`;
