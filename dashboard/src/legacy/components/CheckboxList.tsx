import React, { useEffect } from "react";
import styled from "styled-components";

type PropsType = {
  label?: string;
  options: { disabled?: boolean; value: any; label: string }[];
  selected: { value: any; label: string }[];
  setSelected: (x: { value: any; label: string }[]) => void;
};

const arraysEqual = (a: any, b: any) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const CheckboxList = ({ label, options, selected, setSelected }: PropsType) => {
  let onSelectOption = (option: { value: any; label: string }) => {
    const tmp = [...selected];
    if (
      tmp.filter(
        (e) => e.value === option.value || arraysEqual(e.value, option.value)
      ).length === 0
    ) {
      setSelected([...tmp, option]);
    } else {
      tmp.forEach((x, i) => {
        if (x.value === option.value || arraysEqual(x.value, option.value)) {
          tmp.splice(i, 1);
        }
      });
      setSelected(tmp);
    }
  };

  return (
    <StyledCheckboxList>
      {label && <Label>{label}</Label>}
      {options.map((option: { value: any; label: string }, i: number) => {
        return (
          <CheckboxOption
            isLast={i === options.length - 1}
            onClick={() => onSelectOption(option)}
            key={i}
          >
            <Checkbox
              checked={
                selected.filter(
                  (e) =>
                    e.value === option.value ||
                    arraysEqual(e.value, option.value)
                ).length > 0
              }
            >
              <i className="material-icons">done</i>
            </Checkbox>
            <Text>{option.label}</Text>
          </CheckboxOption>
        );
      })}
    </StyledCheckboxList>
  );
};
export default CheckboxList;

const Text = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  word-break: anywhere;
  margin-right: 10px;
`;

const Checkbox = styled.div`
  width: 14px;
  height: 14px;
  min-width: 14px;
  border: 1px solid #ffffff55;
  margin: 1px 10px 0px 1px;
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
  padding: 0;
`;
