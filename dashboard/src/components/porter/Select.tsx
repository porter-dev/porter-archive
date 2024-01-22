import React from "react";
import styled from "styled-components";

import arrow from "assets/arrow-down.svg";

import Container from "./Container";

type Props = {
  width?: string;
  options: Array<{
    label: string;
    value: string;
    icon?: string;
    disabled?: boolean;
  }>;
  label?: string | React.ReactNode;
  labelColor?: string;
  height?: string;
  error?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  value?: string;
  setValue?: (value: string) => void;
  prefix?: React.ReactNode;
};

const Select: React.FC<Props> = ({
  options,
  label,
  labelColor,
  error,
  children,
  disabled,
  value,
  setValue,
  prefix,
  width = "200px",
  height = "35px",
}) => {
  return (
    <Block width={width}>
      {label && <Label color={labelColor}>{label}</Label>}
      <SelectWrapper>
        <AbsoluteWrapper>
          <Prefix>{prefix}</Prefix>
          <Bar />
          {options.map((option) => {
            if (option.value === value) {
              return (
                <Container key={1} row>
                  {option.icon && <Img src={option?.icon} />}
                  {option.label}
                </Container>
              );
            }
            return null;
          })}
          <img src={arrow} />
        </AbsoluteWrapper>
        <StyledSelect
          onChange={(e) => {
            setValue?.(e.target.value);
          }}
          width={width}
          height={height}
          hasError={(error && true) || error === ""}
          disabled={disabled || false}
          value={value}
        >
          {options.map((option, i) => {
            return (
              <option value={option.value} key={i} disabled={option.disabled}>
                {option.label}
              </option>
            );
          })}
        </StyledSelect>
      </SelectWrapper>
      {error && (
        <Error>
          <i className="material-icons">error</i>
          {error}
        </Error>
      )}
      {children}
    </Block>
  );
};

export default Select;

const Img = styled.img`
  height: 16px;
  margin-right: 10px;
`;

const AbsoluteWrapper = styled.div`
  position: absolute;
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  > img {
    width: 8px;
    position: absolute;
    right: 10px;
    top: calc(50% - 3px);
    z-index: -1;
  }
`;

const Bar = styled.div`
  width: 1px;
  height: 15px;
  background: #494b4f;
  margin-left: 9px;
  margin-right: 11px;
`;

const Prefix = styled.div`
  margin-left: 10px;
  font-size: 13px;
  color: #aaaabb;
  display: flex;
  align-items: center;
  z-index: -1;
`;

const Block = styled.div<{
  width: string;
}>`
  display: block;
  position: relative;
  width: ${(props) => props.width || "200px"};
`;

const Label = styled.div<{ color?: string }>`
  font-size: 13px;
  color: ${({ color = "#aaaabb" }) => color};
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
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
  z-index: 0;
  display: flex;
  align-items: center;
  border-radius: 5px;
  font-size: 13px;
  overflow: hidden;
`;

const StyledSelect = styled.select<{
  width: string;
  height: string;
  hasError: boolean;
}>`
  height: ${(props) => props.height};
  padding: 5px 10px;
  width: ${(props) => props.width};
  color: #ffffff;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  border-radius: 5px;
  background: none;
  appearance: none;
  overflow: hidden;
  opacity: 0;
  z-index: 1;
`;
