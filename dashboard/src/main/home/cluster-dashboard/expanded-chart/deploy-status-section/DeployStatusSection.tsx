import React, { useState, useRef, useEffect } from "react";
import PodDropdown from "./PodDropdown";

import styled from "styled-components";
import { getPodStatus } from "./util";
import { InitLogData } from "../logs-section/LogsSection";

type Props = {
  chart?: any;
  setLogData: (initLogData: InitLogData) => void;
};

type DeployStatus = "Deploying" | "Deployed" | "Failed";

const DeployStatusSection: React.FC<Props> = (props) => {
  const [status, setStatus] = useState<DeployStatus>("Deployed");
  const [percentage, setPercentage] = useState("0%");
  const [isExpanded, setIsExpanded] = useState(false);

  const wrapperRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside.bind(this));
    return () =>
      document.removeEventListener("mousedown", handleClickOutside.bind(this));
  }, []);

  const handleClickOutside = (event: any) => {
    if (
      wrapperRef &&
      wrapperRef.current &&
      !wrapperRef.current.contains(event.target) &&
      parentRef &&
      parentRef.current &&
      !parentRef.current.contains(event.target)
    ) {
      setIsExpanded(false);
    }
  };

  const onUpdate = (props: any) => {
    const { available, total, replicaSetArray } = props;
    let pods = props.pods;

    if (total) {
      const remaining = (total - available) / props.total;
      setPercentage(Math.floor(remaining * 100) + "%");
    }

    if (replicaSetArray.length) {
      pods = replicaSetArray[0];
    }

    const podStatuses = pods.map((pod: any) => getPodStatus(pod.status));

    if (
      podStatuses.every((status: string) =>
        ["running", "Ready", "completed", "Completed"].includes(status)
      )
    ) {
      setStatus("Deployed");
      return;
    }

    if (
      podStatuses.some((status: string) =>
        ["failed", "failedValidation"].includes(status)
      )
    ) {
      setStatus("Failed");
      return;
    }

    setStatus("Deploying");
  };

  return (
    <>
      <StyledDeployStatusSection
        onClick={() => setIsExpanded(!isExpanded)}
        ref={parentRef}
        isExpanded={isExpanded}
      >
        {status === "Deploying" ? (
          <>
            <StatusCircle percentage={percentage} />
            {status}
          </>
        ) : (
          <StatusWrapper>
            <StatusColor status={status} />
            {status}
          </StatusWrapper>
        )}
      </StyledDeployStatusSection>
      <DropdownWrapper expanded={isExpanded}>
        <Dropdown ref={wrapperRef}>
          <PodDropdown
            currentChart={props.chart}
            onUpdate={onUpdate}
            // Allow users to navigate to pod logs upon clicking the pod
            onSelectPod={(pod: any) => {
              console.log(
                "SET LOG DATA",
                pod?.metadata?.name,
                pod?.metadata?.annotations?.["helm.sh/revision"]
              );

              props.setLogData({
                podName: pod?.metadata?.name,
                revision: pod?.metadata?.annotations?.["helm.sh/revision"],
              });
            }}
          />
        </Dropdown>
      </DropdownWrapper>
    </>
  );
};

export default DeployStatusSection;

const StatusCircle = styled.div<{ percentage?: any }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 10px;
  background: conic-gradient(
    from 0deg,
    #ffffff33 ${(props) => props.percentage},
    #ffffffaa 0% ${(props) => props.percentage}
  );
`;

const DropdownWrapper = styled.div<{
  dropdownAlignRight?: boolean;
  expanded?: boolean;
}>`
  display: ${(props) => (props.expanded ? "block" : "none")};
  position: absolute;
  left: ${(props) => (props.dropdownAlignRight ? "" : "0")};
  right: ${(props) => (props.dropdownAlignRight ? "0" : "")};
  z-index: 5;
  top: calc(100% + 7px);
  width: 35%;
  min-width: 400px;
  animation: floatIn 0.2s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const Dropdown = styled.div`
  z-index: 999;
  overflow-y: auto;
  background: #2f3135;
  padding: 0;
  border-radius: 5px;
  border: 1px solid #aaaabb33;
`;

const StyledDeployStatusSection = styled.div<{ isExpanded?: boolean }>`
  font-size: 13px;
  height: 30px;
  border-radius: 5px;
  padding: 0 9px;
  padding-left: 7px;
  display: flex;
  margin-left: -1px;
  align-items: center;
  ${(props) =>
    props.isExpanded &&
    `
  background: #26292e;
  border: 1px solid #494b4f;
  border: 1px solid #7a7b80;
  margin-left: -2px;
  margin-right: -1px;
  `}
  justify-content: center;
  cursor: pointer;
  :hover {
    background: #26292e;
    border: 1px solid #494b4f;
    border: 1px solid #7a7b80;
    margin-left: -2px;
    margin-right: -1px;
  }
`;

const StatusWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
`;

const StatusColor = styled.div`
  width: 8px;
  min-width: 8px;
  height: 8px;
  background: ${(props: { status: DeployStatus }) =>
    props.status === "Deployed"
      ? "#4797ff"
      : props.status === "Failed"
      ? "#ed5f85"
      : "#f5cb42"};
  border-radius: 20px;
`;
