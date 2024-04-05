import React, { useMemo } from "react";
import _ from "lodash";
import pluralize from "pluralize";
import styled from "styled-components";
import { match } from "ts-pattern";

import Container from "components/porter/Container";
import Link from "components/porter/Link";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import {
  type ClientServiceStatus,
  type ServiceStatusDescriptor,
} from "lib/hooks/useAppStatus";
import { isClientServiceNotification } from "lib/porter-apps/notification";

import alert from "assets/alert-warning.svg";

import { useLatestRevision } from "../../../app-view/LatestRevisionContext";

type ServiceStatusFooterProps = {
  status: ClientServiceStatus;
  name: string;
};
const ServiceStatusFooter: React.FC<ServiceStatusFooterProps> = ({
  status,
  name,
}) => {
  const { latestClientNotifications, tabUrlGenerator } = useLatestRevision();

  // group instances by revision number and status
  const instanceGroups: Array<{
    revisionId: string;
    revisionNumber: number;
    status: ServiceStatusDescriptor;
    numInstances: number;
    restartCount: number;
  }> = useMemo(() => {
    return status.versionStatusList
      .map((versionStatus) => {
        const groupByStatus = _.groupBy(
          versionStatus.instanceStatusList,
          (instance) => instance.status
        );
        return Object.keys(groupByStatus).map((status) => {
          return {
            revisionId: versionStatus.revisionId,
            revisionNumber: versionStatus.revisionNumber,
            status: status as ServiceStatusDescriptor,
            numInstances: groupByStatus[status].length,
            restartCount: groupByStatus[status].reduce(
              (acc, instance) => acc + instance.restartCount,
              0
            ),
          };
        });
      })
      .flat()
      .filter((group) => group.status !== "unknown");
  }, [status]);

  return (
    <div>
      {instanceGroups.map((instanceGroup, i) => {
        const versionNotifications = latestClientNotifications
          .filter(isClientServiceNotification)
          .filter((n) => n.appRevisionId === instanceGroup.revisionId)
          .filter((n) => n.service.name.value === name);
        return (
          <div key={i}>
            <StyledStatusFooterTop>
              <StyledContainer row spaced>
                <Running>
                  <StatusDot />
                  <Text color="helper">{`${
                    instanceGroup.numInstances
                  } ${pluralize(
                    "instance",
                    instanceGroup.numInstances
                  )} ${pluralize("is", instanceGroup.numInstances)} ${match(
                    instanceGroup
                  )
                    .with({ status: "failing" }, () => "failing to run")
                    .with({ status: "pending" }, () => "pending")
                    .with({ status: "running" }, () => "running")
                    .otherwise(() => "")} at Version ${
                    instanceGroup.revisionNumber
                  }`}</Text>
                </Running>
                <Container row style={{ gap: "10px" }}>
                  {(instanceGroup.restartCount ?? 0) > 0 && (
                    <Text color="helper">
                      Restarts: {instanceGroup.restartCount}
                    </Text>
                  )}
                  {versionNotifications.length > 0 && (
                    <Tag borderColor="#FFBF00">
                      <Link
                        to={tabUrlGenerator({
                          tab: "notifications",
                        })}
                        color={"#FFBF00"}
                      >
                        <TagIcon src={alert} />
                        Notifications
                      </Link>
                    </Tag>
                  )}
                </Container>
              </StyledContainer>
            </StyledStatusFooterTop>
          </div>
        );
      })}
    </div>
  );
};

export default ServiceStatusFooter;

const StatusDot = styled.div<{ color?: string }>`
  min-width: 7px;
  max-width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 10px;
  background: ${(props) => props.color || "#38a88a"};

  box-shadow: 0 0 0 0 rgba(0, 0, 0, 1);
  transform: scale(1);
  animation: pulse 2s infinite;
  @keyframes pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
    }

    70% {
      transform: scale(1);
      box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
    }

    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
    }
  }
`;

const Running = styled.div`
  display: flex;
  align-items: center;
`;

const StyledStatusFooter = styled.div`
  width: 100%;
  padding: 10px 15px;
  background: ${(props) => props.theme.fg2};
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  border: 1px solid #494b4f;
  border-top: 0;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  flex-direction: row;
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const StyledStatusFooterTop = styled(StyledStatusFooter)`
  height: 40px;
`;

const StyledContainer = styled.div<{
  row: boolean;
  spaced: boolean;
}>`
  display: ${(props) => (props.row ? "flex" : "block")};
  align-items: center;
  justify-content: ${(props) =>
    props.spaced ? "space-between" : "flex-start"};
  width: 100%;
`;

const TagIcon = styled.img`
  height: 12px;
  margin-right: 3px;
`;
