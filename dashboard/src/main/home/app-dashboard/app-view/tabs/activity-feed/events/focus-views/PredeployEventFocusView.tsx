import Spacer from "components/porter/Spacer";
import React from "react";
import dayjs from "dayjs";
import Text from "components/porter/Text";
import { readableDate } from "shared/string_utils";
import { getDuration } from "../utils";
import { AppearingView } from "./EventFocusView";
import Icon from "components/porter/Icon";
import loading from "assets/loading.gif";
import Container from "components/porter/Container";
import { PorterAppPreDeployEvent } from "../types";
import Logs from "main/home/app-dashboard/validate-apply/logs/Logs";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";

type Props = {
  event: PorterAppPreDeployEvent;
};

const PreDeployEventFocusView: React.FC<Props> = ({
  event,
}) => {
  const { projectId, clusterId, latestProto, deploymentTargetId, latestRevision } = useLatestRevision();

  const appName = latestProto.name
  const serviceNames = [`${latestProto.name}-predeploy`]

  const renderHeaderText = () => {
    switch (event.status) {
      case "SUCCESS":
        return <Text color="#68BF8B" size={16}>Pre-deploy succeeded</Text>;
      case "FAILED":
        return <Text color="#FF6060" size={16}>Pre-deploy failed</Text>;
      default:
        return (
          <Container row>
            <Icon height="16px" src={loading} />
            <Spacer inline width="10px" />
            <Text size={16}>Pre-deploy in progress...</Text>
          </Container>
        );
    }
  };

  const renderDurationText = () => {
    switch (event.status) {
      case "PROGRESSING":
        return <Text color="helper">Started {readableDate(event.created_at)}.</Text>
      default:
        return <Text color="helper">Started {readableDate(event.created_at)} and ran for {getDuration(event)}.</Text>;
    }
  }

  return (
    <>
      <AppearingView>
        {renderHeaderText()}
      </AppearingView>
      <Spacer y={0.5} />
      {renderDurationText()}
      <Spacer y={0.5} />
      <Logs
        projectId={projectId}
        clusterId={clusterId}
        appName={appName}
        serviceNames={serviceNames}
        deploymentTargetId={deploymentTargetId}
        latestRevision={latestRevision}
        appRevisionId={event.metadata.app_revision_id}
      />
    </>
  );
};

export default PreDeployEventFocusView;