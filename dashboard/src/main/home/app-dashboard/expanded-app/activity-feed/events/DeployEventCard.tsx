import React, { useEffect, useState } from "react";


import deploy from "assets/deploy.png";
import refresh from "assets/refresh.png";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Icon from "components/porter/Icon";
import Modal from "components/porter/Modal";
import { PorterAppEvent } from "shared/types";
import { getDuration, getStatusIcon } from './utils';
import { StyledEventCard } from "./EventCard";
import styled from "styled-components";
import Button from "components/porter/Button";
import api from "shared/api";
import Link from "components/porter/Link";
import ChangeLogModal from "../../ChangeLogModal";

type Props = {
  event: PorterAppEvent;
  appData: any;
};

const DeployEventCard: React.FC<Props> = ({ event, appData }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [diffModalVisible, setDiffModalVisible] = useState(false);
  const [revertModalVisible, setRevertModalVisible] = useState(false);

  const renderStatusText = (event: PorterAppEvent) => {
    switch (event.status) {
      case "SUCCESS":
        return event?.metadata?.image_tag ? <Text color="#68BF8B">Deployed <Code>{event?.metadata?.image_tag}</Code></Text> : <Text color="#68BF8B">Deployment successful</Text>;
      case "FAILED":
        return <Text color="#FF6060">Deployment failed</Text>;
      default:
        return <Text color="#aaaabb66">Deployment in progress...</Text>;
    }
  };
  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="16px" src={deploy} />
          <Spacer inline width="10px" />
          <Text>Application version no. {event.metadata?.revision}</Text>
        </Container>
      </Container>
      <Spacer y={1} />
      <Container row spaced>
        <Container row>
          <Icon height="16px" src={getStatusIcon(event.status)} />
          <Spacer inline width="10px" />
          {renderStatusText(event)}
          {appData?.chart?.version !== event.metadata?.revision && (
            <>
              <Spacer inline x={1} />
              <TempWrapper>
                <Link hasunderline onClick={() => setRevertModalVisible(true)}>
                  Revert to version {event?.metadata?.revision}
                </Link>
               
              </TempWrapper>
            </>
          )}
          <Spacer inline width="15px" />
          <TempWrapper>
          { event?.metadata?.revision != 1 && ( <Link hasunderline onClick={() =>  setDiffModalVisible(true)}>
              View change log
            </Link>)}
          {diffModalVisible && (
            <ChangeLogModal
              revision={event.metadata.revision}
              currentChart={appData.chart}
              modalVisible={diffModalVisible}
              setModalVisible={setDiffModalVisible}
              appData={appData}
            />
          )}
          {revertModalVisible && (
            <ChangeLogModal
              revision={event.metadata.revision}
              currentChart={appData.chart}
              modalVisible={revertModalVisible}
              setModalVisible={setRevertModalVisible}
              revertModal= {true}
              appData={appData}
            />
          )}
          </TempWrapper>
        </Container>
      </Container>
      
    </StyledEventCard>
  );
};

export default DeployEventCard;

// TODO: remove after fixing v-align
const TempWrapper = styled.div`
  margin-top: -3px;
`;

const Code = styled.span`
  font-family: monospace;
`;

const RevertButton = styled.div<{ width?: string }>`
  border-radius: 5px;
  height: 30px;
  font-size: 13px;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0px 10px;
  background: #ffffff11;
  border: 1px solid #aaaabb33;
  cursor: pointer;
  :hover {
    border: 1px solid #7a7b80;
  }
  width: 92px;
`;
