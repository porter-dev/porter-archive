import Spacer from "components/porter/Spacer";
import React from "react";
import dayjs from "dayjs";
import Text from "components/porter/Text";
import { readableDate } from "shared/string_utils";
import { getDuration } from "../utils";
import LogSection from "../../../logs/LogSection";
import { AppearingView } from "./EventFocusView";
import Icon from "components/porter/Icon";
import loading from "assets/loading.gif";
import Container from "components/porter/Container";
import { PorterAppDeployEvent } from "../types";
import { LogFilterQueryParamOpts } from "../../../logs/types";

type Props = {
    event: PorterAppDeployEvent;
    appData: any;
    filterOpts?: LogFilterQueryParamOpts
};

const DeployEventFocusView: React.FC<Props> = ({
    event,
    appData,
    filterOpts,
}) => {
    const renderHeaderText = () => {
        switch (event.status) {
            case "SUCCESS":
                return <Text color="#68BF8B" size={16}>Deploy succeeded</Text>;
            case "FAILED":
                return <Text color="#FF6060" size={16}>Deploy failed</Text>;
            case "CANCELED":
                return <Text color="#FFBF00" size={16}>Deploy canceled</Text>;
            default:
                return (
                    <Container row>
                        <Icon height="16px" src={loading} />
                        <Spacer inline width="10px" />
                        <Text size={16}>Deploy in progress...</Text>
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
                currentChart={appData.chart}
                appName={appData.app.name}
                filterOpts={filterOpts}
            />
        </>
    );
};

export default DeployEventFocusView;