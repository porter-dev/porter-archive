import Spacer from "components/porter/Spacer";
import React from "react";
import dayjs from "dayjs";
import { PorterAppEvent } from "shared/types";
import Text from "components/porter/Text";
import { readableDate } from "shared/string_utils";
import { getDuration } from "../utils";
import LogSection from "../../../logs/LogSection";
import { AppearingView } from "./EventFocusView";
import Icon from "components/porter/Icon";
import loading from "assets/loading.gif";
import Container from "components/porter/Container";

type Props = {
  event: PorterAppEvent;
  appData: any;
};

const PreDeployEventFocusView: React.FC<Props> = ({
  event,
  appData,
}) => {
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
            <Spacer inline width="10px" /><Text size={16}>Pre-deploy in progress...</Text>
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
      <LogSection
        currentChart={appData.releaseChart}
        timeRange={{
          startTime: dayjs(event.metadata.start_time).subtract(1, 'minute'),
          endTime: event.metadata.end_time != null ? dayjs(event.metadata.end_time).add(1, 'minute') : undefined,
        }}
        showFilter={false}
      />
    </>
  );
};

export default PreDeployEventFocusView;