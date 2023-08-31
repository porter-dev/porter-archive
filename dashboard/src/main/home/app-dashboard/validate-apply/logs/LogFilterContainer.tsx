import React from "react";

import styled from "styled-components";
import filterOutline from "assets/filter-outline-icon.svg";
import filterOutlineWhite from "assets/filter-outline-white.svg";
import { GenericLogFilter, LogFilterName } from "./types";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import LogFilterComponent from "./LogFilterComponent";

type Props = {
    filters: GenericLogFilter[];
    selectedFilterValues: Record<LogFilterName, string>;
};

const LogFilterContainer: React.FC<Props> = (props) => {
    const getIcon = () => {
        if (props.filters.every((filter) => GenericLogFilter.isDefault(filter, props.selectedFilterValues[filter.name]))) {
            return filterOutline;
        }
        return filterOutlineWhite;
    }

    const renderFilters = () => {
        return (
            <FiltersContainer>
                {props.filters.map((filter, i) => {
                    return <LogFilterComponent
                        key={i}
                        filter={filter}
                        selectedValue={props.selectedFilterValues[filter.name]}
                    />
                })}
            </FiltersContainer>
        )
    }

    return (
        <StyledLogFilterContainer>
            <Icon src={getIcon()} height={"16px"} />
            <Spacer inline x={1} />
            <Bar />
            <Spacer inline x={1} />
            {renderFilters()}
        </StyledLogFilterContainer>
    );
};

export default LogFilterContainer;

const Bar = styled.div`
  width: 1px;
  height: calc(18px);
  background: #494b4f;
`;

const StyledLogFilterContainer = styled.div`
  font-size: 13px;
  padding: 10px;
  background: ${(props) => props.theme.fg};
  border-radius: 5px;
  display: flex;
  align-items: center;
  border: 1px solid #494b4f;
  width: fit-content;
`;

const FiltersContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
`
