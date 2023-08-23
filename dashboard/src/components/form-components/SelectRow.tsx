import React, { Component } from "react";
import styled from "styled-components";

import Selector, { SelectorPropsType } from "../Selector";

type PropsType<T> = {
  label: string;
  value: T;
  setActiveValue: (x: T) => void;
  options: { value: T; label: string }[];
  displayFlex?: boolean;
  dropdownLabel?: string;
  width?: string;
  dropdownMaxHeight?: string;
  scrollBuffer?: boolean;
  doc?: string;
  disabled?: boolean;
  selectorProps?: Partial<SelectorPropsType<T>>;
};

export default function SelectRow<T>(props: PropsType<T>) {
  return (
    <StyledSelectRow displayFlex={props.displayFlex}>
      <Wrapper>
        <Label displayFlex={props.displayFlex}>{props.label}</Label>
        {props.doc ? (
          <a href={props.doc} target="_blank">
            <i className="material-icons">help_outline</i>
          </a>
        ) : null}
      </Wrapper>
      <SelectWrapper>
        <Selector
          disabled={props.disabled}
          scrollBuffer={props.scrollBuffer}
          activeValue={props.value}
          setActiveValue={props.setActiveValue}
          options={props.options}
          dropdownLabel={props.dropdownLabel}
          width={props.width || "270px"}
          dropdownWidth={props.width}
          dropdownMaxHeight={props.dropdownMaxHeight}
          {...(props.selectorProps || {})}
        />
      </SelectWrapper>
    </StyledSelectRow>
  );
}

const SelectWrapper = styled.div``;

const Wrapper = styled.div`
  display: flex;
  align-items; center;

  > a {
    > i {
      font-size: 18px;
      margin-left: 8px;
      margin-top: 2px;
      color: #8590ff;
      :hover {
        color: #aaaabb;
      }
    }
  }
`;

const Label = styled.div<{ displayFlex?: boolean }>`
  color: #ffffff;
  font-size: 13px;
  margin-bottom: 10px;
  margin-top: ${props => props.displayFlex ? "10px" : 0};
  margin-right: ${props => props.displayFlex ? "10px" : 0};
`;

const StyledSelectRow = styled.div<{ displayFlex?: boolean }>`
  display: ${props => props.displayFlex ? "flex" : "block"};
  margin-bottom: 15px;
  margin-top: 20px;
`;
