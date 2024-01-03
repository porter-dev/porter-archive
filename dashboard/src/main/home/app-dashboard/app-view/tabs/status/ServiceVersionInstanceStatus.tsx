import React from "react";
import dayjs from "dayjs";
import styled from "styled-components";

import Tooltip from "components/porter/Tooltip";
import {
  statusColor,
  type ClientServiceVersionInstanceStatus,
} from "lib/hooks/useAppStatus";

type Props = {
  serviceVersionInstanceStatus: ClientServiceVersionInstanceStatus;
  isLast: boolean;
};
const ServiceVersionInstanceStatus: React.FC<Props> = ({
  serviceVersionInstanceStatus,
  isLast,
}) => {
  return (
    <Tooltip
      backgroundColor=""
      content={
        <InstanceTooltip>
          {serviceVersionInstanceStatus.name}
          <Grey>
            Restart count: {serviceVersionInstanceStatus.restartCount}
          </Grey>
          <Grey>{`Created: ${dayjs(
            serviceVersionInstanceStatus.creationTimestamp
          ).format("MMM D, YYYY HH:mm:ss")}`}</Grey>
        </InstanceTooltip>
      }
      containerWidth="100%"
      tooltipContentWidth="300px"
    >
      <Tab selected={false} isLast={isLast} onClick={() => ({})}>
        <GutterContainer>
          <Gutter>
            <Rail />
            <Circle />
            <Rail lastTab={isLast} />
          </Gutter>
        </GutterContainer>

        <TooltipContainer>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            <Name>
              <Code>{serviceVersionInstanceStatus.name}</Code>
            </Name>
            <InstanceStatus>
              <StatusColor
                color={statusColor(serviceVersionInstanceStatus.status)}
              />
            </InstanceStatus>
          </div>
        </TooltipContainer>
      </Tab>
    </Tooltip>
  );
};

export default ServiceVersionInstanceStatus;

const Grey = styled.div`
  margin-top: 5px;
  color: #aaaabb;
`;

const GutterContainer = styled.div``;
const TooltipContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
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

const Tab = styled.div<{ selected: boolean; isLast: boolean }>`
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
  background: ${(props: { selected: boolean }) =>
    props.selected ? "#ffffff18" : ""};
  font-size: 13px;
  padding: 20px 19px 20px 42px;
  text-shadow: 0px 0px 8px none;
  overflow: visible;
  border: 1px solid #494b4f;
  border-bottom: ${(props) => (props.isLast ? "1px solid #494b4f" : "none")};
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

const StatusColor = styled.div<{ color: string }>`
  margin-left: 12px;
  width: 8px;
  min-width: 8px;
  height: 8px;
  background: ${({ color }) => color};
  border-radius: 20px;
`;

const Code = styled.span`
  font-family: monospace;
`;
