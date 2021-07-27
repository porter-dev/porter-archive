import React from "react";
import { SelectField, SelectFieldState } from "../types";
import Selector from "../../Selector";
import styled from "styled-components";
import useFormField from "../hooks/useFormField";

const Select: React.FC<SelectField> = (props) => {
  const { variables, setVars } = useFormField<SelectFieldState>(props.id, {});

  return (
    <StyledSelectRow>
      <Label>{props.label}</Label>
      <SelectWrapper>
        <Selector
          activeValue={variables[props.variable]}
          setActiveValue={(val) => {
            setVars(() => {
              return {
                [props.variable]: val,
              };
            });
          }}
          options={props.settings.options}
          dropdownLabel={props.dropdownLabel}
          width={props.width || "270px"}
          dropdownWidth={props.width}
          dropdownMaxHeight={props.dropdownMaxHeight}
        />
      </SelectWrapper>
    </StyledSelectRow>
  );
};

export default Select;

const SelectWrapper = styled.div``;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
`;

const StyledSelectRow = styled.div`
  margin-bottom: 15px;
  margin-top: 20px;
`;
