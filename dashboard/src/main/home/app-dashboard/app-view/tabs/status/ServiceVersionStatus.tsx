import React, { useMemo, useState } from "react";
import styled from "styled-components";

import Link from "components/porter/Link";
import Tag from "components/porter/Tag";
import { type ClientServiceVersionStatus } from "lib/hooks/useAppStatus";
import {
  isClientRevisionNotification,
  isClientServiceNotification,
} from "lib/porter-apps/notification";

import alert from "assets/alert-warning.svg";

import { useLatestRevision } from "../../LatestRevisionContext";
import ServiceVersionInstanceStatus from "./ServiceVersionInstanceStatus";
import StatusTags from "./StatusTags";

type Props = {
  serviceVersionStatus: ClientServiceVersionStatus;
  serviceName: string;
};
const ServiceVersionStatus: React.FC<Props> = ({
  serviceVersionStatus,
  serviceName,
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  const { tabUrlGenerator, latestClientNotifications } = useLatestRevision();

  const notificationsExistForServiceVersion = useMemo(() => {
    return (
      latestClientNotifications
        .filter(isClientRevisionNotification)
        .some((n) => n.appRevisionId === serviceVersionStatus.revisionId) ||
      latestClientNotifications
        .filter(isClientServiceNotification)
        .some(
          (n) =>
            n.appRevisionId === serviceVersionStatus.revisionId &&
            n.service.name.value === serviceName
        )
    );
  }, [
    JSON.stringify(latestClientNotifications),
    JSON.stringify(serviceVersionStatus),
    serviceName,
  ]);

  return (
    <StyledServiceVersionStatus>
      <ResourceHeader
        expanded={expanded}
        onClick={() => {
          setExpanded(!expanded);
        }}
      >
        <Info>
          <DropdownIcon expanded={expanded}>
            <i className="material-icons">arrow_right</i>
          </DropdownIcon>
          <ReplicaSetName>
            <Bold>Version {serviceVersionStatus.revisionNumber}</Bold>
          </ReplicaSetName>
        </Info>
        <div>
          <StatusTags statusList={serviceVersionStatus.instanceStatusList} />

          {notificationsExistForServiceVersion && (
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
        </div>
      </ResourceHeader>
      {expanded && (
        <ServiceVersionInstanceStatusContainer>
          {serviceVersionStatus.instanceStatusList.map((instanceStatus, i) => (
            <ServiceVersionInstanceStatus
              key={instanceStatus.name}
              serviceVersionInstanceStatus={instanceStatus}
              isLast={i === serviceVersionStatus.instanceStatusList.length - 1}
            />
          ))}
        </ServiceVersionInstanceStatusContainer>
      )}
    </StyledServiceVersionStatus>
  );
};

export default ServiceVersionStatus;

const StyledServiceVersionStatus = styled.div``;

const ServiceVersionInstanceStatusContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ResourceHeader = styled.div<{ expanded: boolean }>`
  width: 100%;
  height: 50px;
  display: flex;
  font-size: 13px;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  padding: 8px 18px;
  cursor: pointer;
  border: 1px solid #494b4f;
  border-bottom: ${(props) => (props.expanded ? "none" : "1px solid #494b4f")};

  :hover {
    background: #ffffff18;

    > i {
      background: #ffffff22;
    }
  }
`;

const Info = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 80%;
  height: 100%;
`;

const DropdownIcon = styled.div`
  > i {
    margin-top: 2px;
    margin-right: 11px;
    font-size: 20px;
    color: #ffffff66;
    cursor: pointer;
    border-radius: 20px;
    background: ${(props: { expanded: boolean }) =>
      props.expanded ? "#ffffff18" : ""};
    transform: ${(props: { expanded: boolean }) =>
      props.expanded ? "rotate(180deg)" : ""};
    animation: ${(props: { expanded: boolean }) =>
      props.expanded ? "quarterTurn 0.3s" : ""};
    animation-fill-mode: forwards;

    @keyframes quarterTurn {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(90deg);
      }
    }
  }
`;

const ReplicaSetName = styled.span`
  padding-left: 10px;
  overflow-wrap: anywhere;
  max-width: calc(100% - 45px);
  line-height: 1.5em;
  color: #ffffff33;
`;

const Bold = styled.span`
  font-weight: 500;
  display: inline;
  color: #ffffff;
`;

const TagIcon = styled.img`
  height: 12px;
  margin-right: 3px;
`;
