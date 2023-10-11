import Spacer from "components/porter/Spacer";
import React from "react";
import Text from "components/porter/Text";
import { readableDate } from "shared/string_utils";
import Icon from "components/porter/Icon";
import loading from "assets/loading.gif";
import Container from "components/porter/Container";
import Logs from "main/home/app-dashboard/validate-apply/logs/Logs";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import { JobRun } from "lib/hooks/useJobs";
import { match } from "ts-pattern";
import { getStatusColor } from "../../app-view/tabs/activity-feed/events/utils";
import { AppearingView } from "../../app-view/tabs/activity-feed/events/focus-views/EventFocusView";
import { getDuration } from "./utils";
import { Link } from "react-router-dom";
import styled from "styled-components";
import dayjs from "dayjs";

type Props = {
    jobRun: JobRun;
};

const JobRunDetails: React.FC<Props> = ({
    jobRun,
}) => {
    const { projectId, clusterId, latestProto, deploymentTarget } = useLatestRevision();

    const appName = latestProto.name

    const renderHeaderText = () => {
        return match(jobRun)
            .with({ status: { succeeded: 1 } }, () => <Text color={getStatusColor("SUCCESS")} size={16}>Job run succeeded</Text>)
            .with({ status: { failed: 1 } }, () => <Text color={getStatusColor("FAILED")} size={16}>Job run failed</Text>)
            .otherwise(() => (
                <Container row>
                    <Icon height="16px" src={loading} />
                    <Spacer inline width="10px" />
                    <Text size={16} color={getStatusColor("PROGRESSING")}>Job run in progress...</Text>
                </Container>
            ));
    };

    const renderDurationText = () => {
        return match(jobRun)
            .with({ status: { succeeded: 1 } }, () => <Text color="helper">Started {readableDate(jobRun.status.startTime ?? jobRun.metadata.creationTimestamp)} and ran for {getDuration(jobRun)}.</Text>)
            .with({ status: { failed: 1 } }, () => <Text color="helper">Started {readableDate(jobRun.status.startTime ?? jobRun.metadata.creationTimestamp)} and ran for {getDuration(jobRun)}.</Text>)
            .otherwise(() => <Text color="helper">Started {readableDate(jobRun.status.startTime ?? jobRun.metadata.creationTimestamp)}.</Text>);
    }

    return (
        <>
            <Link to={`/apps/${latestProto.name}/job-history?service=${jobRun.jobName}`}>
                <BackButton>
                    <i className="material-icons">keyboard_backspace</i>
                    Job run history
                </BackButton>
            </Link>
            <Spacer y={0.5} />
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
                serviceNames={[jobRun.jobName ?? "all"]}
                deploymentTargetId={deploymentTarget.id}
                appRevisionId={jobRun.metadata.labels["porter.run/app-revision-id"]}
                logFilterNames={["service_name"]}
                timeRange={{
                    startTime: dayjs(jobRun.status.startTime ?? jobRun.metadata.creationTimestamp).subtract(30, 'second'),
                    endTime: jobRun.status.completionTime != null ? dayjs(jobRun.status.completionTime).add(30, 'second') : undefined,
                }}
                appId={parseInt(jobRun.metadata.labels["porter.run/app-id"])}
            />
        </>
    );
};

export default JobRunDetails;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  max-width: fit-content;
  cursor: pointer;
  font-size: 11px;
  max-height: fit-content;
  padding: 5px 13px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
  }
`;