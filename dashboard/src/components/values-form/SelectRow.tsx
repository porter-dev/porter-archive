import React, { Component } from 'react';
import styled from 'styled-components';

import Selector from '../Selector';

type PropsType = {
  label: string,
  value: string,
  setActiveValue: (x: string) => void,
  options: { value: string, label: string }[],
  dropdownLabel?: string
};

type StateType = {
};

export default class SelectRow extends Component<PropsType, StateType> {
  render() {
    return (
      <StyledSelectRow>
        <Label>{this.props.label}</Label>
        <SelectWrapper>
          <Selector
            activeValue={this.props.value}
            setActiveValue={this.props.setActiveValue}
            options={this.props.options}
            dropdownLabel={this.props.dropdownLabel}
            width='270px'
            dropdownMaxHeight={'210px'}
          />
        </SelectWrapper>
      </StyledSelectRow>
    );
  }
}

const SelectWrapper = styled.div`
  display: flex;
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
`;

const StyledSelectRow = styled.div`
  margin-bottom: 15px;
  margin-top: 20px;
`;