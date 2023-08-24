import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";
import { RouteComponentProps, withRouter } from "react-router";
import Spacer from "./porter/Spacer";

import Text from "./porter/Text";
import healthy from "assets/status-healthy.png";
import failure from "assets/failure.svg";
import { PREFLIGHT_MESSAGE_CONST } from "shared/util";

type Props = RouteComponentProps & {
  preflightData: any
  setPreflightFailed: (x: boolean) => void;
};


const PreflightChecks: React.FC<Props> = (props) => {
  const [trackFailures, setFailures] = useState<boolean>(false)
  const PreflightCheckItem = ({ check }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasMessage = !!check.value?.message;
    if (hasMessage) {
      setFailures(hasMessage)
    }
    const handleToggle = () => {
      if (hasMessage) {
        setIsExpanded(!isExpanded);
      }
    }
    props.setPreflightFailed(trackFailures)
    return (
      <CheckItemContainer hasMessage={hasMessage} onClick={handleToggle}>
        <CheckItemTop>
          {hasMessage ? <StatusIcon src={failure} /> : <StatusIcon src={healthy} />}
          <Spacer inline x={1} />
          <Text style={{ marginLeft: '10px', flex: 1 }}>{PREFLIGHT_MESSAGE_CONST[check.key]}</Text>
          {hasMessage && <ExpandIcon className="material-icons" isExpanded={isExpanded}>
            arrow_drop_down
          </ExpandIcon>}
        </CheckItemTop>
        {isExpanded && hasMessage && (
          <div>
            <ErrorMessageLabel>Error Message:</ErrorMessageLabel>
            <ErrorMessageContent>{check.value.message}</ErrorMessageContent>
            <ErrorMessageLabel>Enable:</ErrorMessageLabel>
            <ErrorMessageContent>{check.value.metadata ? check.value.metadata.Enable : "Please Contact Porter Support at support@porter.run"}</ErrorMessageContent>
          </div>
        )}
      </CheckItemContainer>
    );
  };

  return (
    <div>
      {props.preflightData && (
        <AppearingDiv>
          <Text> Preflight Checks </Text>
          <Spacer y={.5} />
          {Object.entries(props.preflightData.preflight_checks || {}).map(([key, value]) => (
            <PreflightCheckItem key={key} check={{ key, value }} />
          ))}
        </AppearingDiv>
      )}
    </div>
  );
};


export default withRouter(PreflightChecks);


const AppearingDiv = styled.div<{ color?: string }>`
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  display: flex;
  flex-direction: column; 
  color: ${(props) => props.color || "#ffffff44"};
  margin-left: 10px;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
const StatusIcon = styled.img`
height: 14px;
`;

const CheckItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${props => props.theme.border};
  border-radius: 5px;
  font-size: 13px;
  width: 100%;
  margin-bottom: 10px;
  padding-left: 10px;
  cursor: ${props => (props.hasMessage ? 'pointer' : 'default')};
  background: ${props => props.theme.clickable.bg};

`;

const CheckItemTop = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  background: ${props => props.theme.clickable.bg};
`;

const ExpandIcon = styled.i<{ isExpanded: boolean }>`
  margin-left: 8px;
  color: #ffffff66;
  font-size: 20px;
  cursor: pointer;
  border-radius: 20px;
  transform: ${props => props.isExpanded ? "" : "rotate(-90deg)"};
`;
const ErrorMessageLabel = styled.span`
  font-weight: bold;
  margin-left: 10px;
`;
const ErrorMessageContent = styled.div`
  font-family: 'Courier New', Courier, monospace;
  padding: 5px 10px;
  border-radius: 4px;
  margin-left: 10px;
  user-select: text;
  cursor: text
`;