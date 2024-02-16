import React, { useMemo } from "react";
import styled from "styled-components";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import { readableDate } from "shared/string_utils";

import { useClusterContext } from "./ClusterContextProvider";
import ClusterStatus from "./ClusterStatus";

const ClusterHeader: React.FC = () => {
  const { cluster, isClusterUpdating, nodes } = useClusterContext();

  const applicationNodes = useMemo(() => {
    return nodes.filter((n) => n.nodeGroupType === "APPLICATION");
  }, [nodes]);

  return (
    <>
      <Container row>
        <Icon src={cluster.cloud_provider.icon} height="22px" />
        <Spacer inline x={1} />
        <Text size={21}>{cluster.vanity_name}</Text>
      </Container>
      <Spacer y={0.5} />
      <CreatedAtContainer>
        <div style={{ flexShrink: 0 }}>
          <Text color="#aaaabb66">
            Updated {readableDate(cluster.contract.updated_at)}
          </Text>
        </div>
        <Spacer y={0.5} />
      </CreatedAtContainer>
      {isClusterUpdating ||
        (applicationNodes.length !== 0 && (
          <>
            <Spacer y={0.5} />
            <ClusterStatus />
          </>
        ))}
    </>
  );
};

export default ClusterHeader;

const CreatedAtContainer = styled.div`
  display: inline-flex;
  column-gap: 6px;
`;
