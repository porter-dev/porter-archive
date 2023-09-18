import { PorterAppFormData } from "lib/porter-apps";
import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { IterableElement } from "type-fest";

type Props = {
  index: number;
  remove: (index: number) => void;
  envGroup: IterableElement<PorterAppFormData["app"]["envGroups"]>;
};

const ExpandableEnvGroup: React.FC<Props> = ({ index, remove, envGroup }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <StyledCard>
      <Flex>
        <ContentContainer>
          <EventInformation>
            <EventName>{envGroup.name}</EventName>
          </EventInformation>
        </ContentContainer>
        <ActionContainer>
          <ActionButton onClick={() => remove(index)}>
            <span className="material-icons">delete</span>
          </ActionButton>
          <ActionButton onClick={() => setIsExpanded((prev) => !prev)}>
            <i className="material-icons">
              {isExpanded ? "arrow_drop_up" : "arrow_drop_down"}
            </i>
          </ActionButton>
        </ActionContainer>
      </Flex> 
      {isExpanded ? <></> : null}
    </StyledCard>
  );
};

export default ExpandableEnvGroup;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const StyledCard = styled.div`
  border: 1px solid #ffffff44;
  background: #ffffff11;
  margin-bottom: 5px;
  border-radius: 8px;
  margin-top: 15px;
  padding: 10px 14px;
  overflow: hidden;
  font-size: 13px;
  animation: ${fadeIn} 0.5s;
`;

const Flex = styled.div`
  display: flex;
  height: 25px;
  align-items: center;
  justify-content: space-between;
`;

const ContentContainer = styled.div`
  display: flex;
  height: 40px;
  width: 100%;
  align-items: center;
`;

const EventInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const EventName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const ActionButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  width: 30px;
  height: 30px;
  margin-left: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;
  border: 1px solid #ffffff00;

  :hover {
    background: #ffffff11;
    border: 1px solid #ffffff44;
  }

  > span {
    font-size: 20px;
  }
`;

const NoVariablesTextWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff99;
`;
