import React, { Component } from "react";
import styled from "styled-components";
import ParentSize from '@visx/responsive/lib/components/ParentSize';

import { Context } from "shared/Context";
import { ChartType } from "shared/types";

import TabSelector from "components/TabSelector";
import AreaChart from "./AreaChart";

type PropsType = {
  currentChart: ChartType;
};

type StateType = {
  selectedRange: string,
  selectedMetricLabel: string,
  dropdownExpanded: boolean,
};

export default class ListSection extends Component<PropsType, StateType> {
  state = {
    selectedRange: '1H',
    selectedMetricLabel: 'CPU Utilization',
    dropdownExpanded: false,
  }

  renderDropdown = () => {
    if (this.state.dropdownExpanded) {
      return (
        <>
          <DropdownOverlay onClick={() => this.setState({ dropdownExpanded: false })} />
          <Dropdown
            dropdownWidth='200px'
            dropdownMaxHeight='200px'
            onClick={() => this.setState({ dropdownExpanded: false })}
          >
            {this.renderOptionList()}
          </Dropdown>
        </>
      );
    }
  };

  renderOptionList = () => {
    let metricOptions = [
      { value: 'cpu', label: 'CPU Utilization' },
      { value: 'ram', label: 'RAM Utilization' },
    ];
    return metricOptions.map(
      (option: { value: string; label: string }, i: number) => {
        return (
          <Option
            key={i}
            selected={option.label === this.state.selectedMetricLabel}
            onClick={() => this.setState({ selectedMetricLabel: option.label })}
            lastItem={i === metricOptions.length - 1}
          >
            {option.label}
          </Option>
        );
      }
    );
  };

  render() {
    return (
      <StyledMetricsSection>
        <ParentSize>
          {({ width, height }) => <AreaChart width={width} height={height} />}
        </ParentSize>
        <MetricSelector 
          onClick={() => this.setState({ dropdownExpanded: !this.state.dropdownExpanded })}
        >
          {this.state.selectedMetricLabel}
          <i className="material-icons">arrow_drop_down</i>
          {this.renderDropdown()}
        </MetricSelector>
        <RangeWrapper>
          <TabSelector
            options={[
              { value: '1H', label: '1H' }, 
              { value: '1D', label: '1D' },
              { value: '1M', label: '1M' }, 
              { value: '3M', label: '3M' },
              { value: '1Y', label: '1Y' }, 
              { value: 'ALL', label: 'ALL' },
            ]}
            currentTab={this.state.selectedRange}
            setCurrentTab={(x: string) => this.setState({ selectedRange: x })}
          />
        </RangeWrapper>
      </StyledMetricsSection>
    );
  }
}

ListSection.contextType = Context;

const DropdownOverlay = styled.div`
  position: fixed;
  width: 100%;
  height: 100%;
  z-index: 10;
  left: 0px;
  top: 0px;
  cursor: default;
`;

const Option = styled.div`
  width: 100%;
  border-top: 1px solid #00000000;
  border-bottom: 1px solid
    ${(props: { selected: boolean; lastItem: boolean }) =>
      props.lastItem ? "#ffffff00" : "#ffffff15"};
  height: 37px;
  font-size: 13px;
  padding-top: 9px;
  align-items: center;
  padding-left: 15px;
  cursor: pointer;
  padding-right: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${(props: { selected: boolean; lastItem: boolean }) =>
    props.selected ? "#ffffff11" : ""};

  :hover {
    background: #ffffff22;
  }
`;

const Dropdown = styled.div`
  position: absolute;
  left: 0;
  top: calc(100% + 10px);
  background: #26282f;
  width: ${(props: { dropdownWidth: string; dropdownMaxHeight: string }) =>
    props.dropdownWidth};
  max-height: ${(props: { dropdownWidth: string; dropdownMaxHeight: string }) =>
    props.dropdownMaxHeight || "300px"};
  border-radius: 3px;
  z-index: 999;
  overflow-y: auto;
  margin-bottom: 20px;
  box-shadow: 0 4px 8px 0px #00000088;
`;

const RangeWrapper = styled.div`
  position: absolute;
  bottom: 10px;
  font-weight: bold;
  left: 0;
  width: 100%;
`;

const MetricSelector = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: #ffffff;
  position: absolute;
  top: 0;
  left: 5px;
  display: flex;
  align-items: center;
  cursor: pointer;
  border-radius: 5px;
  :hover {
    > i {
      background: #ffffff22;
    }
  }

  > i {
    border-radius: 20px;
    font-size: 20px;
    margin-left: 10px;
  }
`;

const StyledMetricsSection = styled.div`
  width: 100%;
  height: 100%;
  background: #20222700;
  display: flex;
  position: relative;
  font-size: 13px;
  border-radius: 5px;
  overflow: hidden;
`;
