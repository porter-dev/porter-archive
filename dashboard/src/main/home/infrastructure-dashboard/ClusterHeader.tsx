import React, { useContext, useMemo } from "react";
import styled from "styled-components";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import { Context } from "shared/Context";
import { readableDate } from "shared/string_utils";
import info from "assets/information-circle-contained.svg";

import { useClusterContext } from "./ClusterContextProvider";
import ClusterContractViewModal from "./ClusterContractViewModal";
import ClusterStatus from "./ClusterStatus";

const ClusterHeader: React.FC = () => {
  const { cluster, isClusterUpdating, nodes } = useClusterContext();
  const { user } = useContext(Context);
  const [showClusterContract, setShowClusterContract] =
    React.useState<boolean>(false);

  const applicationNodes = useMemo(() => {
    return nodes.filter((n) => n.nodeGroupType === "APPLICATION");
  }, [nodes]);

  return (
    <>
      <Container row spaced>
        <Container row>
          <Icon src={cluster.cloud_provider.icon} height="22px" />
          <Spacer inline x={1} />
          <Text size={21}>{cluster.vanity_name}</Text>
          {user?.email?.endsWith("@porter.run") && (
            <>
              <Spacer inline x={1} />
              <div
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setShowClusterContract(true);
                }}
              >
                <Icon src={info} height={"14px"} />
              </div>
            </>
          )}
        </Container>
      </Container>
      <Spacer y={0.5} />
      {cluster.contract != null && (
        <CreatedAtContainer>
          <div style={{ flexShrink: 0 }}>
            <Text color="#aaaabb66">
              Updated {readableDate(cluster.contract.updated_at)}
            </Text>
          </div>
          <Spacer y={0.5} />
        </CreatedAtContainer>
      )}
      {isClusterUpdating ||
        (applicationNodes.length !== 0 && (
          <>
            <Spacer y={0.5} />
            <ClusterStatus />
          </>
        ))}
      {showClusterContract && (
        <ClusterContractViewModal
          onClose={() => {
            setShowClusterContract(false);
          }}
        />
      )}
    </>
  );
};

export default ClusterHeader;

const CreatedAtContainer = styled.div`
  display: inline-flex;
  column-gap: 6px;
`;
