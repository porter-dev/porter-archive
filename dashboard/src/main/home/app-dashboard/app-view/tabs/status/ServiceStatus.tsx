import React, { useState } from "react";
import styled from "styled-components";

import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import { type ClientServiceStatus } from "lib/hooks/useAppStatus";
import { type ClientService } from "lib/porter-apps/services";

import job from "assets/job.png";
import web from "assets/web.png";
import worker from "assets/worker.png";

import ServiceVersionInstanceStatus from "./ServiceVersionInstanceStatus";

type Props = {
  isLast: boolean;
  service: ClientService;
  serviceVersionStatusList: ClientServiceStatus[];
};

const ServiceStatus: React.FC<Props> = ({
  isLast,
  serviceVersionStatusList,
  service,
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  const renderIcon = (service: ClientService): JSX.Element => {
    switch (service.config.type) {
      case "web":
        return <Icon src={web} />;
      case "worker":
        return <Icon src={worker} />;
      case "job":
        return <Icon src={job} />;
      case "predeploy":
        return <Icon src={job} />;
    }
  };

  return (
    <StyledResourceTab
      isLast={isLast}
      onClick={() => ({})}
      roundAllCorners={true}
    >
      {/* <ResourceHeader
        hasChildren={true}
        expanded={expanded}
        onClick={() => {
          setExpanded(!expanded);
        }}
      >
        <Info>
          <DropdownIcon expanded={expanded}>
            <i className="material-icons">arrow_right</i>
          </DropdownIcon>
          <ServiceNameTag>
            {match(service.config.type)
              .with("web", () => <ServiceTypeIcon src={web} />)
              .with("worker", () => <ServiceTypeIcon src={worker} />)
              .with("job", () => <ServiceTypeIcon src={job} />)
              .with("predeploy", () => <ServiceTypeIcon src={job} />)
              .exhaustive()}
            <Spacer inline x={0.5} />
            {service.name.value}
          </ServiceNameTag>
        </Info>
        <Status>
          test status
          <StatusColor status={"running"} />
        </Status>
      </ResourceHeader> */}
      <ServiceHeader
        showExpanded={expanded}
        onClick={() => {
          setExpanded(!expanded);
        }}
        bordersRounded={!expanded}
      >
        <ServiceTitle>
          <ActionButton>
            <span className="material-icons dropdown">arrow_drop_down</span>
          </ActionButton>
          {renderIcon(service)}
          <Spacer inline x={1} />
          {service.name.value}
        </ServiceTitle>

        <Status>
          test status
          <StatusColor status={"running"} />
        </Status>
      </ServiceHeader>
      {expanded && (
        <ExpandWrapper>
          {serviceVersionStatusList.map((versionStatus) => {
            return (
              <div key={versionStatus.revisionId}>
                <ResourceHeader
                  hasChildren={true}
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
                      <Bold>Version {versionStatus.revisionNumber}:</Bold>
                    </ReplicaSetName>
                  </Info>
                  <Status>
                    test status
                    <StatusColor status={"running"} />
                  </Status>
                </ResourceHeader>
                {/* <ReplicaSetContainer>
                  <ReplicaSetName>
                    <Bold>Version {versionStatus.revisionNumber}:</Bold>
                  </ReplicaSetName>
                </ReplicaSetContainer> */}
                <ServiceVersionInstanceStatus
                  serviceVersionStatus={versionStatus}
                />
              </div>
            );
          })}
          {/* <ConfirmOverlay
            message="Are you sure you want to delete this pod?"
            show={podPendingDelete}
            onYes={() => handleDeletePod(podPendingDelete)}
            onNo={() => setPodPendingDelete(null)}
          /> */}
        </ExpandWrapper>
      )}
    </StyledResourceTab>
  );
};

export default ServiceStatus;

const StyledResourceTab = styled.div`
  width: 100%;
  margin-bottom: 2px;
  font-size: 13px;
  background: ${(props) => props.theme.fg};
  border-bottom-left-radius: ${(props: {
    isLast: boolean;
    roundAllCorners: boolean;
  }) => (props.isLast ? "10px" : "")};
`;

// const Tooltip = styled.div`
//   position: absolute;
//   right: 0px;
//   top: 25px;
//   white-space: nowrap;
//   height: 18px;
//   padding: 2px 5px;
//   background: #383842dd;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   flex: 1;
//   color: white;
//   text-transform: none;
//   font-size: 12px;
//   outline: 1px solid #ffffff55;
//   opacity: 0;
//   animation: faded-in 0.2s 0.15s;
//   animation-fill-mode: forwards;
//   @keyframes faded-in {
//     from {
//       opacity: 0;
//     }
//     to {
//       opacity: 1;
//     }
//   }
// `;

const ExpandWrapper = styled.div``;

const ResourceHeader = styled.div`
  width: 100%;
  height: 50px;
  display: flex;
  font-size: 13px;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  padding: 8px 18px;
  padding-left: ${(props: { expanded: boolean; hasChildren: boolean }) =>
    props.hasChildren ? "10px" : "22px"};
  cursor: pointer;
  background: ${(props: { expanded: boolean; hasChildren: boolean }) =>
    props.expanded ? "#ffffff11" : ""};
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

const Metadata = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  max-width: ${(props: { hasStatus: boolean }) =>
    props.hasStatus ? "calc(100% - 20px)" : "100%"};
`;

const Status = styled.div`
  display: flex;
  width; 20%;
  font-size: 12px;
  text-transform: capitalize;
  justify-content: flex-end;
  align-items: center;
  color: #aaaabb;
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from { opacity: 0 }
    to { opacity: 1 }
  }
`;

const StatusColor = styled.div`
  margin-left: 12px;
  width: 8px;
  min-width: 8px;
  height: 8px;
  background: ${(props: { status: string }) =>
    props.status === "running" ||
    props.status === "Ready" ||
    props.status === "Completed"
      ? "#4797ff"
      : props.status === "failed" || props.status === "FailedValidation"
      ? "#ed5f85"
      : props.status === "completed"
      ? "#00d12a"
      : "#f5cb42"};
  border-radius: 20px;
`;

const ResourceName = styled.div`
  color: #ffffff;
  max-width: 40%;
  margin-left: ${(props: { showKindLabels: boolean }) =>
    props.showKindLabels ? "10px" : ""};
  text-transform: none;
  white-space: nowrap;
`;

const IconWrapper = styled.div`
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 15px;
    color: #ffffff;
    margin-right: 14px;
  }
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

const ReplicaSetContainer = styled.div`
  padding: 10px 5px;
  display: flex;
  overflow-wrap: anywhere;
  justify-content: space-between;
  border-top: 2px solid #ffffff11;
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

const ActionButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;

  > span {
    font-size: 20px;
  }
  margin-right: 5px;
`;

const ServiceHeader = styled.div<{
  showExpanded?: boolean;
  bordersRounded?: boolean;
}>`
  flex-direction: row;
  display: flex;
  height: 60px;
  font-size: 18px;
  justify-content: space-between;
  cursor: pointer;
  padding: 20px;
  color: ${(props) => props.theme.text.primary};
  position: relative;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
    ${ActionButton} {
      color: white;
    }
  }

  border-bottom-left-radius: ${(props) => (props.bordersRounded ? "" : "0")};
  border-bottom-right-radius: ${(props) => (props.bordersRounded ? "" : "0")};

  .dropdown {
    font-size: 30px;
    cursor: pointer;
    border-radius: 20px;
    margin-left: -10px;
    transform: ${(props: { showExpanded?: boolean }) =>
      props.showExpanded ? "" : "rotate(-90deg)"};
  }
`;

const ServiceTitle = styled.div`
  display: flex;
  align-items: center;
`;
