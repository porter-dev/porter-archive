import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  width?: string;
  options: { label: string; value: string }[];
  label?: string | React.ReactNode;
  height?: string;
  error?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  onChange?: (value: string) => void;
};

const Select: React.FC<Props> = ({
  width,
  options,
  label,
  height,
  error,
  children,
  disabled,
  onChange,
}) => {
  const [value, setValue] = useState("");

  return (
    <Block width={width}>
      {
        label && (
          <Label>{label}</Label>
        )
      }
      <SelectWrapper>
        <i className="material-icons">arrow_drop_down</i>
        <StyledSelect
          onChange={e => {
            setValue(e.target.value);
            onChange && onChange(e.target.value);
          }}
          width={width}
          height={height}
          hasError={(error && true) || (error === "")}
          disabled={disabled ? disabled : false}
        >
          {options.map((option, i) => {
            return <option value={option.value} key={i}>{option.label}</option>;
          })}
        </StyledSelect>
      </SelectWrapper>
      {
        error && (
          <Error>
            <i className="material-icons">error</i>
            {error}
          </Error>
        )
      }
      {children}
    </Block>
  );
};

export default Select;

const Block = styled.div<{
  width: string;
}>`
  display: block;
  position: relative;
  width: ${props => props.width || "200px"};
`;

const Label = styled.div`
  font-size: 13px;
  color: #aaaabb;
  margin-bottom: 10px;
`;

const Error = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #ff3b62;
  margin-top: 10px;

  > i {
    font-size: 18px;
    margin-right: 5px;
  }
`;

const SelectWrapper = styled.div`
  position: relative;
  background: #26292e;
  z-index: 0;
  > i {
    font-size: 18px;
    position: absolute;
    right: 7px;
    top: calc(50% - 9px);
    z-index: -1;
  }
`;

const StyledSelect = styled.select<{
  width: string;
  height: string;
  hasError: boolean;
}>`
  height: ${props => props.height || "35px"};
  padding: 5px 10px;
  width: ${props => props.width || "200px"};
  color: #ffffff;
  font-size: 13px;
  outline: none;
  border-radius: 5px;
  background: none;
  appearance: none;
  z-index: 1;
  border: 1px solid ${props => props.hasError ? "#ff3b62" : "#494b4f"};
  :hover {
    border: 1px solid ${props => props.hasError ? "#ff3b62" : "#7a7b80"};
  }
`;