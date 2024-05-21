import React from "react";
import styled, { css } from "styled-components";

import arrow from "assets/arrow-down.svg";

import Container from "./Container";

type Props = {
  options: Array<{
    label: string;
    value: string;
    icon?: string;
    disabled?: boolean;
  }>;
  label?: string | React.ReactNode;
  labelColor?: string;
  error?: string;
  disabled?: boolean;
  value?: string;
  setValue?: (value: string) => void;
  prefix?: React.ReactNode;
  width?: string;
  height?: string;
  noShrink?: boolean;
};

const Select: React.FC<Props> = ({
  options,
  label,
  labelColor,
  error,
  disabled,
  value,
  setValue,
  prefix,
  width,
  height,
  noShrink,
}) => {
  return (
    <Div width={width} noShrink={noShrink}>
      {label && <Label color={labelColor}>{label}</Label>}
      <SelectWrapper isDisabled={disabled ?? false} height={height}>
        {prefix && (
          <>
            <Prefix>{prefix}</Prefix>
            <Bar />
          </>
        )}
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
        <SelectLayer
          value={value}
          onChange={(e) => {
            setValue?.(e.target.value);
          }}
          hasError={(error && true) || error === ""}
          disabled={disabled}
        >
          {options.map((option, i) => {
            return (
              <option value={option.value} key={i} disabled={option.disabled}>
                {option.label}
              </option>
            );
          })}
        </SelectLayer>
      </SelectWrapper>
      {error && (
        <Error>
          <i className="material-icons">error</i>
          {error}
        </Error>
      )}
    </Div>
  );
};

export default Select;

const Div = styled.div<{ width?: string, noShrink?: boolean }>`
  width: ${({ width }) => width || ""};
  ${({ noShrink }) => (noShrink ? "flex-shrink: 0;" : "")}
`;

const Img = styled.img`
  height: 16px;
  margin-right: 10px;
`;

const Bar = styled.div`
  width: 1px;
  height: 15px;
  background: #494b4f;
  margin-left: 9px;
  margin-right: 11px;
`;

const Prefix = styled.div`
  font-size: 13px;
  color: #aaaabb;
  display: flex;
  align-items: center;
  z-index: -1;
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

const SelectWrapper = styled.div<{ isDisabled: boolean; height?: string }>`
  position: relative;
  padding-left: 10px;
  padding-right: 28px;
  height: ${(props) => props.height || "30px"};
  transition: all 0.2s;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  z-index: 0;
  display: flex;
  align-items: center;
  border-radius: 5px;
  font-size: 13px;
  overflow: hidden;

  > img {
    width: 8px;
    position: absolute;
    right: 10px;
    top: calc(50% - 3px);
    z-index: -1;
  }

  ${(props) =>
    !props.isDisabled
      ? css`
          :hover {
            border: 1px solid #7a7b80;
          }
        `
      : css`
          color: #ffffff55;
          > img {
            opacity: 0.5;
          }
        `}
`;

const SelectLayer = styled.select<{
  hasError: boolean;
  disabled?: boolean;
}>`
  outline: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  background: none;
  appearance: none;
  opacity: 0;
  z-index: 1;
`;
