import React, { useState, useRef, useEffect } from "react";
import PodDropdown from "./PodDropdown";

import styled from "styled-components";

type Props = {
  chart?: any;
};

const DeployStatusSection: React.FC<Props> = (props) => {
  const [someState, setSomeState] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [percentage, setPercentage] = useState<string>("10%");

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
  
  const renderDropdown = () => {
    if (isExpanded) {
      return (
        <DropdownWrapper>
          <Dropdown ref={wrapperRef}>
            <PodDropdown currentChart={props.chart} />
          </Dropdown>
        </DropdownWrapper>
      );
    }
  }

  return (
    <>
      <StyledDeployStatusSection 
        onClick={() => setIsExpanded(!isExpanded)}
        ref={parentRef}
        isExpanded={isExpanded}
      >
        <StatusCircle percentage={percentage} />
        Deploying
      </StyledDeployStatusSection>
      {renderDropdown()}
    </>
  );
};

export default DeployStatusSection;

const StatusCircle = styled.div<{ percentage?: any }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 10px;
  background: 
    conic-gradient(from 0deg, 
      #ffffff33 ${props => props.percentage}, #ffffffaa 0% ${props => props.percentage});
`;

const DropdownWrapper = styled.div<{ dropdownAlignRight?: boolean }>`
  position: absolute;
  left: ${(props) => (props.dropdownAlignRight ? "" : "0")};
  right: ${(props) => (props.dropdownAlignRight ? "0" : "")};
  z-index: 1;
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

const DropdownIcon = styled.img`
  width: 8px;
  margin-left: 12px;
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
  ${props => props.isExpanded && `
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
