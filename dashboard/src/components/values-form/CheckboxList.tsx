import React from "react";
import styled from "styled-components";

type PropsType = {
  label?: string;
  options: { disabled?: boolean; value: string; label: string }[];
  selected: { value: string; label: string }[];
  setSelected: (x: { value: string; label: string }[]) => void;
};

const CheckboxList = ({ label, options, selected, setSelected }: PropsType) => {
  let onSelectOption = (option: { value: string; label: string }) => {
    if (!selected.includes(option)) {
      selected.push(option);
      setSelected(selected);
    } else {
      selected.splice(selected.indexOf(option), 1);
      setSelected(selected);
    }
  };

  return (
    <StyledCheckboxList>
      {label && <Label>{label}</Label>}
      {options.map((option: { value: string; label: string }, i: number) => {
        return (
          <CheckboxOption
            isLast={i === options.length - 1}
            onClick={() => onSelectOption(option)}
            key={i}
          >
            <Checkbox checked={selected.includes(option)}>
              <i className="material-icons">done</i>
            </Checkbox>
            {option.label}
          </CheckboxOption>
        );
      })}
    </StyledCheckboxList>
  );
};
export default CheckboxList;

const Checkbox = styled.div`
  width: 16px;
  height: 16px;
  border: 1px solid #ffffff55;
  margin: 1px 15px 0px 1px;
  border-radius: 3px;
  background: ${(props: { checked: boolean }) =>
    props.checked ? "#ffffff22" : "#ffffff11"};
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 12px;
    padding-left: 0px;
    display: ${(props: { checked: boolean }) => (props.checked ? "" : "none")};
  }
`;

const CheckboxOption = styled.div<{ isLast: boolean }>`
  width: 100%;
  height: 35px;
  padding-left: 10px;
  display: flex;
  cursor: pointer;
  align-items: center;
  border-bottom: ${(props) => (props.isLast ? "" : "1px solid #ffffff22")};
  font-size: 13px;

  :hover {
    background: #ffffff18;
  }
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
`;

const StyledCheckboxList = styled.div`
  border-radius: 3px;
  border: 1px solid #ffffff55;
  padding: 0;
  background: #ffffff11;
  margin-bottom: 15px;
  margin-top: 20px;
`;
