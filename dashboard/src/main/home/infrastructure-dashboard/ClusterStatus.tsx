import React, { useMemo } from "react";
import styled from "styled-components";

import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import StatusDot from "components/porter/StatusDot";
import Text from "components/porter/Text";
import { useClusterNodeList } from "lib/hooks/useCluster";

import { useClusterContext } from "./ClusterContextProvider";

const ClusterStatus: React.FC = () => {
  const { cluster } = useClusterContext();

  const { nodes } = useClusterNodeList({ clusterId: cluster.id });

  // Filter to only include user applications nodes
  const applicationNodes = useMemo(() => {
    return nodes.filter(
      (node) => node?.labels["porter.run/workload-kind"] === "application"
    );
  }, [nodes]);

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
          Running {applicationNodes.length}{" "}
          <Code>
            {applicationNodes[0]?.labels["node.kubernetes.io/instance-type"]}
          </Code>{" "}
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
