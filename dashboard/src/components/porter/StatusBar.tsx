import React from "react";
import styled from "styled-components";

import LoadingBar from "./LoadingBar";
import Spacer from "./Spacer";
import Text from "./Text";

type StatusBarProps = {
  icon: string;
  title: string;
  titleDescriptor?: string;
  subtitle: string;
  percentCompleted: number;
  failureReason?: string;
};

const StatusBar: React.FC<StatusBarProps> = ({
  icon,
  title,
  titleDescriptor,
  subtitle,
  percentCompleted,
  failureReason,
}) => {
  // Component logic here

  return (
    <StyledProvisionerStatus>
      <HeaderSection>
        <TitleSection>
          <Flex>
            <Icon src={icon} />
            {title}
          </Flex>
          {titleDescriptor && <Text color="helper">{titleDescriptor}</Text>}
        </TitleSection>
        <Spacer height="18px" />
        <LoadingBar
          color={failureReason ? "failed" : undefined}
          percent={percentCompleted}
        />
        <Spacer height="18px" />
        <Text color="#aaaabb">{subtitle}</Text>
      </HeaderSection>
      {failureReason && <DummyLogs>Error: {failureReason}</DummyLogs>}
    </StyledProvisionerStatus>
  );
};

export default StatusBar;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const HeaderSection = styled.div`
  padding: 15px;
  padding-bottom: 18px;
`;

const DummyLogs = styled.div`
  padding: 15px;
  width: 100%;
  display: flex;
  font-size: 13px;
  background: #101420;
  font-family: monospace;
`;

const Icon = styled.img`
  height: 16px;
  margin-right: 10px;
  margin-bottom: -1px;
`;

const StyledProvisionerStatus = styled.div`
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  font-size: 13px;
  width: 100%;
  overflow: hidden;
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;
