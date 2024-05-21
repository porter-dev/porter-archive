import React from "react";
import dayjs from "dayjs";
import loading from "legacy/assets/loading.gif";
import Container from "legacy/components/porter/Container";
import Icon from "legacy/components/porter/Icon";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { readableDate } from "legacy/shared/string_utils";

import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import Logs from "main/home/app-dashboard/validate-apply/logs/Logs";

import { type PorterAppPreDeployEvent } from "../types";
import { getDuration, getStatusColor } from "../utils";
import { AppearingView } from "./EventFocusView";

type Props = {
  event: PorterAppPreDeployEvent;
};

const PreDeployEventFocusView: React.FC<Props> = ({ event }) => {
  const { projectId, clusterId, latestProto, deploymentTarget, porterApp } =
    useLatestRevision();

  const appName = latestProto.name;
  const serviceNames = ["predeploy"];

  const renderHeaderText = (): JSX.Element => {
    switch (event.status) {
      case "SUCCESS":
        return (
          <Text color={getStatusColor(event.status)} size={16}>
            Pre-deploy succeeded
          </Text>
        );
      case "FAILED":
        return (
          <Text color={getStatusColor(event.status)} size={16}>
            Pre-deploy failed
          </Text>
        );
      default:
        return (
          <Container row>
            <Icon height="16px" src={loading} />
            <Spacer inline width="10px" />
            <Text size={16} color={getStatusColor(event.status)}>
              Pre-deploy in progress...
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
        timeRange={
          // make sure time isn't undefined
          event?.metadata?.end_time &&
          // make sure this isn't a nil time
          new Date(event?.metadata?.end_time) > new Date(event.created_at)
            ? {
                startTime: dayjs(event.created_at).subtract(30, "second"),
                endTime: dayjs(event?.metadata?.end_time).add(30, "second"),
              }
            : undefined
        }
      />
    </>
  );
};

export default PreDeployEventFocusView;
