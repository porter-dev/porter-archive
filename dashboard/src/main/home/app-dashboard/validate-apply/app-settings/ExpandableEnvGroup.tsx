import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { PopulatedEnvGroup } from "./types";
import Spacer from "components/porter/Spacer";

type Props = {
  index: number;
  remove: (index: number) => void;
  envGroup: PopulatedEnvGroup;
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
          <ActionButton type="button" onClick={() => remove(index)}>
            <span className="material-icons">delete</span>
          </ActionButton>
          <ActionButton
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            <i className="material-icons">
              {isExpanded ? "arrow_drop_up" : "arrow_drop_down"}
            </i>
          </ActionButton>
        </ActionContainer>
      </Flex>
      {isExpanded ? (
        <>
          {Object.entries(envGroup.variables ?? {}).map(([key, value], i) => (
            <InputWrapper key={i}>
              <KeyInput
                placeholder="ex: key"
                width="270px"
                value={key}
                disabled
              />
              <Spacer x={0.5} inline />
              <MultiLineInput
                placeholder="ex: value"
                width="270px"
                value={value}
                disabled
                rows={value.split("\n").length}
                spellCheck={false}
              />
            </InputWrapper>
          ))}
          {Object.entries(envGroup.secret_variables ?? {}).map(
            ([key, value], i) => (
              <InputWrapper key={i}>
                <KeyInput
                  placeholder="ex: key"
                  width="270px"
                  value={key}
                  disabled
                />
                <Spacer x={0.5} inline />
                <KeyInput
                  placeholder="ex: value"
                  width="270px"
                  value={value}
                  disabled
                  type="password"
                />
              </InputWrapper>
            )
          )}
        </>
      ) : null}
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

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;
`;

type InputProps = {
  disabled?: boolean;
  width: string;
  borderColor?: string;
};

const KeyInput = styled.input<InputProps>`
  outline: none;
  border: none;
  margin-bottom: 5px;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid
    ${(props) => (props.borderColor ? props.borderColor : "#ffffff55")};
  border-radius: 3px;
  width: ${(props) => (props.width ? props.width : "270px")};
  color: ${(props) => (props.disabled ? "#ffffff44" : "white")};
  padding: 5px 10px;
  height: 35px;
`;

export const MultiLineInput = styled.textarea<InputProps>`
  outline: none;
  border: none;
  margin-bottom: 5px;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid
    ${(props) => (props.borderColor ? props.borderColor : "#ffffff55")};
  border-radius: 3px;
  min-width: ${(props) => (props.width ? props.width : "270px")};
  max-width: ${(props) => (props.width ? props.width : "270px")};
  color: ${(props) => (props.disabled ? "#ffffff44" : "white")};
  padding: 8px 10px 5px 10px;
  min-height: 35px;
  max-height: 100px;
  white-space: nowrap;

  ::-webkit-scrollbar {
    width: 8px;
    :horizontal {
      height: 8px;
    }
  }

  ::-webkit-scrollbar-corner {
    width: 10px;
    background: #ffffff11;
    color: white;
  }

  ::-webkit-scrollbar-track {
    width: 10px;
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  }

  ::-webkit-scrollbar-thumb {
    background-color: darkgrey;
    outline: 1px solid slategrey;
  }
`;
