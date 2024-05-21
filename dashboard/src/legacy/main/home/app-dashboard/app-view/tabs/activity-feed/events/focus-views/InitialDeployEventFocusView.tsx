import React from "react";
import loading from "legacy/assets/loading.gif";
import Container from "legacy/components/porter/Container";
import Icon from "legacy/components/porter/Icon";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { readableDate } from "legacy/shared/string_utils";

import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import Logs from "main/home/app-dashboard/validate-apply/logs/Logs";

import { type PorterAppInitialDeployEvent } from "../types";
import { getDuration, getStatusColor } from "../utils";
import { AppearingView } from "./EventFocusView";

type Props = {
  event: PorterAppInitialDeployEvent;
};

const InitialDeployEventFocusView: React.FC<Props> = ({ event }) => {
  const { projectId, clusterId, latestProto, deploymentTarget, porterApp } =
    useLatestRevision();

  const appName = latestProto.name;
  const serviceNames = ["initdeploy"];

  const renderHeaderText = (): JSX.Element => {
    switch (event.status) {
      case "SUCCESS":
        return (
          <Text color={getStatusColor(event.status)} size={16}>
            Initial deploy job succeeded
          </Text>
        );
      case "FAILED":
        return (
          <Text color={getStatusColor(event.status)} size={16}>
            Initial deploy job failed
          </Text>
        );
      default:
        return (
          <Container row>
            <Icon height="16px" src={loading} />
            <Spacer inline width="10px" />
            <Text size={16} color={getStatusColor(event.status)}>
              Initial deploy job in progress...
            </Text>
          </Container>
        );
    }
  };

  const renderDurationText = (): JSX.Element => {
    switch (event.status) {
      case "PROGRESSING":
        return (
          <Text color="helper">Started {readableDate(event.created_at)}.</Text>
        );
      default:
        return (
          <Text color="helper">
            Started {readableDate(event.created_at)} and ran for{" "}
            {getDuration(event)}.
          </Text>
        );
    }
  };

  return (
    <>
      <AppearingView>{renderHeaderText()}</AppearingView>
      <Spacer y={0.5} />
      {renderDurationText()}
      <Spacer y={0.5} />
      <Logs
        projectId={projectId}
        clusterId={clusterId}
        appName={appName}
        serviceNames={serviceNames}
        deploymentTargetId={deploymentTarget.id}
        appRevisionId={event.metadata.app_revision_id}
        logFilterNames={["service_name"]}
        appId={porterApp.id}
        filterPredeploy={true}
      />
    </>
  );
};

export default InitialDeployEventFocusView;
