import React, { useEffect, useState, useRef } from "react";

import styled from "styled-components";
import arrow from "assets/arrow-down.svg";

import CheckboxList from "components/form-components/CheckboxList";

type Props = {
  name: string;
  icon?: any;
  options: { value: any; label: string }[];
  selected: any[];
  setSelected: any;
};

export const MultiSelectFilter: React.FC<Props> = (props) => {
  const [expanded, setExpanded] = useState(false);

  const wrapperRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside.bind(this));
    return () =>
      document.removeEventListener("mousedown", handleClickOutside.bind(this));
  }, []);

  const handleClickOutside = (event: any) => {
    if (
      wrapperRef &&
      wrapperRef.current &&
      !wrapperRef.current.contains(event.target) &&
      parentRef &&
      parentRef.current &&
      !parentRef.current.contains(event.target)
    ) {
      setExpanded(false);
    }
  };

  const renderOptions = () => {
    return props.options.map(
      (option: { value: any; label: string }, i: number) => {
        return (
          <Option key={i} onClick={() => alert("choise")}>
            {option.label}
          </Option>
        );
      }
    );
  };

  const renderDropdown = () => {
    if (expanded) {
      return (
        <DropdownWrapper>
          <Dropdown ref={wrapperRef}>
            {props.options.length > 0 ? (
              <ScrollableWrapper>
                <CheckboxList
                  options={props.options}
                  selected={props.selected}
                  setSelected={props.setSelected}
                />
              </ScrollableWrapper>
            ) : (
              <Placeholder>No options found</Placeholder>
            )}
          </Dropdown>
        </DropdownWrapper>
      );
    }
  };

  return (
    <Relative>
      <StyledMultiSelectFilter
        onClick={() => setExpanded(!expanded)}
        ref={parentRef}
      >
        {props.icon && <FilterIcon src={props.icon} />}
        {props.name}
        {props.selected.length > 0 && (
          <FilterCount>{props.selected.length}</FilterCount>
        )}
        <DropdownIcon src={arrow} />
      </StyledMultiSelectFilter>
      {renderDropdown()}
    </Relative>
  );
};

const FilterCount = styled.div`
  padding: 5px;
  color: #ffffff;
  background: #ffffff11;
  margin-left: 7px;
  font-size: 12px;
  border-radius: 50px;
  margin-right: -5px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
`;

const Placeholder = styled.div`
  color: #aaaabb88;
  font-size: 12px;
  width: 100%;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ScrollableWrapper = styled.div`
  overflow-y: auto;
  height: 100%;
  max-height: 350px;
`;

const Label = styled.div`
  height: 37px;
  display: flex;
  align-items: center;
  margin-left: 10px;
  font-size: 13px;
`;

const Option: any = styled.div`
  width: 100%;
  border-top: 1px solid #00000000;
  height: 37px;
  font-size: 13px;
  align-items: center;
  display: flex;
  align-items: center;
  padding-left: 15px;
  cursor: pointer;
  padding-right: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${(props: any) => (props.selected ? "#ffffff11" : "")};

  :hover {
    background: #ffffff22;
  }
`;

const Relative = styled.div`
  position: relative;
`;

const DropdownWrapper = styled.div`
  position: absolute;
  width: 100%;
  right: 0;
  z-index: 1;
  top: calc(100% + 5px);
`;

const Dropdown = styled.div`
  width: 260px;
  border-radius: 3px;
  z-index: 999;
  overflow-y: auto;
  margin-bottom: 20px;
  background: #2f3135;
  border-radius: 5px;
  border: 1px solid #aaaabb33;
`;

const DropdownIcon = styled.img`
  width: 8px;
  margin-left: 12px;
`;

const FilterIcon = styled.img`
  width: 14px;
  margin-right: 7px;
`;

const StyledMultiSelectFilter = styled.div`
  height: 30px;
  font-size: 13px;
  position: relative;
  padding: 10px;
  background: #26292e;
  border-radius: 5px;
  border: 1px solid #aaaabb33;
  display: flex;
  align-items: center;
  margin-right: 10px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
  }
`;
