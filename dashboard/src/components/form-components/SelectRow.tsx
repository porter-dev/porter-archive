import React, { Component } from "react";
import styled from "styled-components";

import Selector, { SelectorPropsType } from "../Selector";

type PropsType<T> = {
  label: string;
  value: T;
  setActiveValue: (x: T) => void;
  options: { value: T; label: string }[];
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
      <StyledSelectRow>
        <Wrapper>
          <Label>{props.label}</Label>
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

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
  font-size: 13px;
`;

const StyledSelectRow = styled.div`
  margin-bottom: 15px;
  margin-top: 20px;
`;
