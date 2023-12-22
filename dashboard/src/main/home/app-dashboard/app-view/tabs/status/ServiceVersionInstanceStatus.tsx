import React from "react";
import styled from "styled-components";

import Tooltip from "components/porter/Tooltip";
import { type ClientServiceStatus } from "lib/hooks/useAppStatus";

type Props = {
  serviceVersionStatus: ClientServiceStatus;
};
const ServiceVersionInstanceStatus: React.FC<Props> = ({
  serviceVersionStatus,
}) => {
  return (
    <Tab selected={true} onClick={() => ({})}>
      <Gutter>
        <Rail />
        <Circle />
        <Rail lastTab={false} />
      </Gutter>
      <Tooltip
        content={
          <InstanceTooltip>
            Version: {serviceVersionStatus.revisionNumber}
            <Grey>Restart count: {serviceVersionStatus.restartCount}</Grey>
            <Grey>Created on: 3 days</Grey>
            {serviceVersionStatus.status === "failing" ? (
              <FailedStatusContainer>
                <Grey>
                  Failure Reason: {serviceVersionStatus.crashLoopReason}
                </Grey>
              </FailedStatusContainer>
            ) : null}
          </InstanceTooltip>
        }
      >
        <Name>Version: {serviceVersionStatus.revisionNumber}</Name>
      </Tooltip>
      <InstanceStatus>
        <StatusColor status={"running"} />
        {serviceVersionStatus.status}
      </InstanceStatus>
    </Tab>
  );
};

export default ServiceVersionInstanceStatus;

const Grey = styled.div`
  margin-top: 5px;
  color: #aaaabb;
`;

const FailedStatusContainer = styled.div`
  width: 100%;
  border: 1px solid hsl(0deg, 100%, 30%);
  padding: 5px;
  margin-block: 5px;
`;

const InstanceTooltip = styled.div`
  position: absolute;
  left: 35px;
  word-wrap: break-word;
  top: 38px;
  min-height: 18px;
  max-width: calc(100% - 75px);
  padding: 5px 7px;
  background: #272731;
  z-index: 999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  color: white;
  text-transform: none;
  font-size: 12px;
  font-family: "Work Sans", sans-serif;
  outline: 1px solid #ffffff55;
  opacity: 0;
  animation: faded-in 0.2s 0.15s;
  animation-fill-mode: forwards;
  @keyframes faded-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const Tab = styled.div`
  width: 100%;
  height: 50px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: ${(props: { selected: boolean }) =>
    props.selected ? "white" : "#ffffff66"};
  background: ${(props: { selected: boolean }) =>
    props.selected ? "#ffffff18" : ""};
  font-size: 13px;
  padding: 20px 19px 20px 42px;
  text-shadow: 0px 0px 8px none;
  overflow: visible;
  cursor: pointer;
  :hover {
    color: white;
    background: #ffffff18;
  }
`;

const Rail = styled.div`
  width: 2px;
  background: ${(props: { lastTab?: boolean }) =>
    props.lastTab ? "" : "#52545D"};
  height: 50%;
`;

const Circle = styled.div`
  min-width: 10px;
  min-height: 2px;
  margin-bottom: -2px;
  margin-left: 8px;
  background: #52545d;
`;

const Gutter = styled.div`
  position: absolute;
  top: 0px;
  left: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: visible;
`;

const InstanceStatus = styled.div`
  display: flex;
  font-size: 12px;
  text-transform: capitalize;
  margin-left: 5px;
  justify-content: flex-end;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  color: #aaaabb;
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

const Name = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5em;
  display: -webkit-box;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
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
