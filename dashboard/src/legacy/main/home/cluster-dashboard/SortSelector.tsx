import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";

import RadioFilter from "components/RadioFilter";
import sort from "assets/sort.svg";

type PropsType = {
  setSortType: (x: string) => void;
  sortType: string;
  currentView: string;
};

type StateType = {
  sortOptions: { label: string; value: string }[];
};

// TODO: fix update to unmounted component
export default class SortSelector extends Component<PropsType, StateType> {
  state = {
    sortOptions: [
      { label: "Newest", value: "Newest" },
      { label: "Oldest", value: "Oldest" },
      { label: "Alphabetical", value: "Alphabetical" },
      { label: "Next Run", value: "Next Run" },
    ] as { label: string; value: string }[],
  };

  getSortOptions() {
    if (this.props.currentView === "jobs") {
      return [
        { label: "Newest", value: "Newest" },
        { label: "Oldest", value: "Oldest" },
        { label: "Alphabetical", value: "Alphabetical" },
        { label: "Next Run", value: "Next Run" },
      ];
    }

    return [
      { label: "Newest", value: "Newest" },
      { label: "Oldest", value: "Oldest" },
      { label: "Alphabetical", value: "Alphabetical" },
    ];
  }

  render() {
    return (
      <StyledSortSelector>
        <RadioFilter
          selected={this.props.sortType}
          setSelected={(sortType: any) => this.props.setSortType(sortType)}
          options={this.getSortOptions()}
          name="Sort"
          icon={sort}
          dropdownAlignRight={false}
          noMargin
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
