import React, { Component } from 'react';
import styled from 'styled-components';

import { Context } from '../../../shared/Context';

import Selector from '../../../components/Selector';

type PropsType = {
  setSortType: (x: string) => void,
  sortType: string
};

type StateType = {
  sortOptions: { label: string, value: string }[]
};

// TODO: fix update to unmounted component 
export default class SortSelector extends Component<PropsType, StateType> {
  state = {
    sortOptions: [
      { label: 'chronological', value: 'chronological' },
      { label: 'alphabetical', value: 'alphabetical' }
    ] as {label: string, value: string}[]
  }

  render() {
    return ( 
      <StyledSortSelector>
        <Label>
          <i className="material-icons">sort</i> Sort
        </Label>
        <Selector
          activeValue={this.props.sortType}
          setActiveValue={(sortType) => this.props.setSortType(sortType)}
          options={this.state.sortOptions}
          dropdownLabel='Sort By'
          width='150px'
          dropdownWidth='230px'
          closeOverlay={true}
        />
      </StyledSortSelector>
    );
  }
}

SortSelector.contextType = Context;

const Label = styled.div`
  display: flex;
  align-items: center;
  margin-right: 12px;

  > i {
    margin-right: 8px;
    font-size: 18px;
  }
`;

const StyledSortSelector = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
`;