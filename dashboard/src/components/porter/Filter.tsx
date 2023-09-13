import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Select from "./Select";
import Spacer from "./Spacer";

type Props = {
  filters: any;
  selectedFilterValues: Record<any, string>;
  generateFilterString: (selectedFilterValues: any) => string;
};

const Filter: React.FC<Props> = ({
  filters,
  selectedFilterValues,
  generateFilterString,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Relative>
      <StyledFilter onClick={() => setIsExpanded(!isExpanded)}>
        <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 18">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="m2.133 2.6 5.856 6.9L8 14l4 3 .011-7.5 5.856-6.9a1 1 0 0 0-.804-1.6H2.937a1 1 0 0 0-.804 1.6Z"/>
        </svg>
        Filter
        {generateFilterString(selectedFilterValues) !== "" && (
          <>
            <Bar />
            <Spacer width="10px" />
            {generateFilterString(selectedFilterValues)}
          </>
        )}
      </StyledFilter>
      <CloseOverlay onClick={() => setIsExpanded(false)} isExpanded={isExpanded} />
      <Dropdown isExpanded={isExpanded}>
        {filters.map((filter: any, i: number) => {
          return (
            <React.Fragment key={i}>
              <FilterLabel>{filter.displayName}</FilterLabel>
              <Spacer height="10px" />
              <Select
                options={[filter.default, ...filter.options]}
                setValue={filter.setValue}
              />
              {i < filter.length && <Spacer height="15px" />}
            </React.Fragment>
          );
        })}
      </Dropdown>
    </Relative>
  );
};

export default Filter;

const Bar = styled.div`
  width: 1px;
  height: calc(100%);
  background: #494b4f;
  margin: 0 10px;
`;

const CloseOverlay = styled.div<{ isExpanded: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 998;
  width: 100vw;
  height: 100vh;
  display: ${props => props.isExpanded ? "block" : "none"};
`;

const FilterLabel = styled.div`
`;

const Dropdown = styled.div<{ isExpanded: boolean }>`
  position: absolute;
  top: 40px;
  left: 0;
  border-radius: 5px;
  font-size: 13px;
  background: #121212;
  border: 1px solid #494B4F;
  padding: 10px;
  padding-bottom: 15px;
  z-index: 999;
  display: ${props => props.isExpanded ? "block" : "none"};
`;

const Relative = styled.div`
  position: relative;
`;

const StyledFilter = styled.div<{
}>`
  display: flex;
  align-items: center;
  color: #ffffff;
  font-size: 13px;
  height: 30px;
  border-radius: 5px;
  background: ${props => props.theme.fg};
  padding: 0px 10px;
  cursor: pointer;

  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }

  > svg {
    height: 13px;
    width: 13px;
    color: #fff;
    margin-right: 8px;
  }
`;