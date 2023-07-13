import React, { useEffect, useState, useRef } from "react";

import styled from "styled-components";
import arrow from "assets/arrow-down.svg";
import filterOutline from "assets/filter-outline-icon.svg";
import filterOutlineWhite from "assets/filter-outline-white.svg";
import { GenericLogFilter, LogFilterName } from "./types";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import LogFilterComponent from "./LogFilterComponent";

type Props = {
    icon?: any;
    options: { value: any; label: string }[];
    selected: any;
    setSelected: any;
    noMargin?: boolean;
    dropdownAlignRight?: boolean;
    filters: GenericLogFilter[];
    selectedFilterValues: Record<LogFilterName, string>;
};

const LogFilter: React.FC<Props> = (props) => {

    const getIcon = () => {
        if (props.filters.every((filter) => GenericLogFilter.isDefault(filter, props.selectedFilterValues[filter.name]))) {
            return filterOutline;
        }
        return filterOutlineWhite;
    }

    const renderFilters = () => {
        return props.filters.map((filter, i) => {
            return <>
                <LogFilterComponent
                    key={i}
                    options={[filter.default, ...filter.options]}
                    name={filter.displayName}
                />
                <Spacer inline x={0.5} />
            </>
        })
    }

    return (
        <Relative>
            <StyledRadioFilter>
                <Icon src={getIcon()} height={"16px"} />
                <Spacer inline x={1} />
                <Bar />
                <Spacer inline x={1} />
                {renderFilters()}
            </StyledRadioFilter>
            {/* {renderDropdown()} */}
        </Relative>
    );
};

export default LogFilter;

const Bar = styled.div`
  width: 1px;
  height: calc(18px);
  background: #494b4f;
`;

const Relative = styled.div`
  position: relative;
`;

const StyledRadioFilter = styled.div<{ noMargin?: boolean }>`
  height: 40px;
  font-size: 13px;
  position: relative;
  padding: 10px;
  background: ${(props) => props.theme.fg};
  border-radius: 5px;
  display: flex;
  align-items: center;
  cursor: pointer;
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
`;
