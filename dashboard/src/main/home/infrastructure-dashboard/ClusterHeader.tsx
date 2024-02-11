import React, { useContext } from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import StatusDot from "components/porter/StatusDot";
import Text from "components/porter/Text";

import { Context } from "shared/Context";
import { readableDate } from "shared/string_utils";
import editIcon from "assets/edit-button.svg";

import ClusterSettingsModal from "../cluster-dashboard/dashboard/ClusterSettingsModal";
import { useClusterContext } from "./ClusterContextProvider";

const ClusterHeader: React.FC = () => {
  const { cluster } = useClusterContext();
  const { setCurrentModal } = useContext(Context);

  return (
    <>
      <Container row style={{ width: "100%" }}>
        <Container row spaced style={{ width: "100%" }}>
          <Container row>
            <Icon src={cluster.cloud_provider.icon} height={"25px"} />
            <Spacer inline x={1} />
            <Text size={21}>{cluster.vanity_name}</Text>
            <Spacer inline x={1} />
            <EditIconStyle
              onClick={() => {
                setCurrentModal?.(<ClusterSettingsModal />);
              }}
            >
              <img src={editIcon} />
            </EditIconStyle>
          </Container>
          {match(cluster.status)
            .with("READY", () => (
              <Container row>
                <StatusDot status={"available"} heightPixels={11} />
              </Container>
            ))
            .otherwise(() => (
              <Container row>
                <StatusDot status={"pending"} heightPixels={11} />
              </Container>
            ))}
        </Container>
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
    </>
  );
};

export default ClusterHeader;

const CreatedAtContainer = styled.div`
  display: inline-flex;
  column-gap: 6px;
`;

const EditIconStyle = styled.div`
  width: 20px;
  height: 20px;
  margin-left: -5px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 40px;
  margin-bottom: 3px;
  :hover {
    background: #ffffff18;
  }
  > img {
    width: 22px;
    opacity: 0.4;
    margin-bottom: -4px;
  }
`;
