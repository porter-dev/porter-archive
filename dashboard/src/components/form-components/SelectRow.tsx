import React, { Component } from "react";
import styled from "styled-components";

import Selector from "../Selector";

type PropsType = {
  label: string;
  value: string;
  setActiveValue: (x: string) => void;
  options: { value: string; label: string }[];
  dropdownLabel?: string;
  width?: string;
  dropdownMaxHeight?: string;
  scrollBuffer?: boolean;
  doc?: string;
};

type StateType = {};

export default class SelectRow extends Component<PropsType, StateType> {
  render() {
    return (
      <StyledSelectRow>
        <Wrapper> 
        <Label>
          {this.props.label}
        </Label>
        { this.props.doc ? 
          <a href={this.props.doc} target="_blank">
              <i className="material-icons">help_outline</i>
          </a> : null
        }
        </Wrapper>
        <SelectWrapper>
          <Selector
            scrollBuffer={this.props.scrollBuffer}
            activeValue={this.props.value}
            setActiveValue={this.props.setActiveValue}
            options={this.props.options}
            dropdownLabel={this.props.dropdownLabel}
            width={this.props.width || "270px"}
            dropdownWidth={this.props.width}
            dropdownMaxHeight={this.props.dropdownMaxHeight}
          />
        </SelectWrapper>
      </StyledSelectRow>
    );
  }
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
`

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
  font-size: 13px;
`;

const StyledSelectRow = styled.div`
  margin-bottom: 15px;
  margin-top: 20px;
`;
