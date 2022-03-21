import React from "react";
import styled from "styled-components";

const DisplaySwitch = (props: {
  onChange: (option: "table" | "list") => void;
  value: "table" | "list";
}): JSX.Element => {
  return (
    <DisplaySelectorContainer>
      <DisplaySelectorLeftOption
        active={props.value === "table"}
        onClick={() => props.onChange("table")}
      >
        <span className="material-icons-outlined">table_view</span>
      </DisplaySelectorLeftOption>
      <DisplaySelectorRightOption
        active={props.value === "list"}
        onClick={() => props.onChange("list")}
      >
        <span className="material-icons-outlined">toc</span>
      </DisplaySelectorRightOption>
    </DisplaySelectorContainer>
  );
};

export default DisplaySwitch;

const DisplaySelectorContainer = styled.div`
  width: fit-content;
  display: flex;
  margin-bottom: 15px;
`;

const DisplaySelectorLeftOption = styled.div`
  padding: 5px 10px 5px 10px;
  border-radius: 15px 0 0 15px;
  cursor: pointer;
  display: flex;
  align-items: center;

  ${(props: { active: boolean }) => {
    if (!props.active) {
      return "";
    }

    return `
      background: #2e2e2e;
      color: #ffffff88;
    `;
  }}

  :hover {
    background: #2e2e2e;
    color: #ffffff88;
  }
`;

const DisplaySelectorRightOption = styled.div`
  padding: 5px 10px 5px 10px;
  cursor: pointer;
  border-radius: 0 15px 15px 0;
  display: flex;
  align-items: center;

  ${(props: { active: boolean }) => {
    if (!props.active) {
      return "";
    }

    return `
      background: #2e2e2e;
      color: #ffffff88;
    `;
  }}

  :hover {
    background: #2e2e2e;
    color: #ffffff88;
  }
`;
