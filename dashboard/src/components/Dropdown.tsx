import React, { useState } from "react";
import styled from "styled-components";

type Option = {
  value: unknown;
  label: string;
};

type DropdownProps = {
  options: Array<Option>;
  selectedOption: Option;
  onSelect: (selectedOption: Option) => unknown;
  selectLabel?: (currentLabel: string) => void;
  selectValue?: (currentValue: any) => void;
};

const Dropdown: React.FunctionComponent<DropdownProps> = ({
  options,
  selectedOption,
  selectLabel,
  selectValue,
  onSelect,
}) => {
  const [isDropdownExpanded, setIsDropdownExpanded] = useState(false);

  const handleSelectOption = (option: Option) => {
    if (selectedOption.label === option.label) {
      return;
    }
    onSelect(option);
    typeof selectLabel === "function" && selectLabel(option.label);
    typeof selectValue === "function" && selectValue(option.value);
  };

  const renderDropdown = () => {
    if (isDropdownExpanded) {
      return (
        <>
          <DropdownOverlay onClick={() => setIsDropdownExpanded(false)} />
          <OptionWrapper
            dropdownWidth="230px"
            dropdownMaxHeight="200px"
            onClick={() => setIsDropdownExpanded(false)}
          >
            {renderOptionList()}
          </OptionWrapper>
        </>
      );
    }
  };

  const renderOptionList = () => {
    return options.map((option, i, originalArray) => {
      return (
        <Option
          key={i}
          selected={option.label === selectedOption.label}
          onClick={() => handleSelectOption(option)}
          lastItem={i === originalArray.length - 1}
        >
          {option.label}
        </Option>
      );
    });
  };

  return (
    <DropdownSelector
      onClick={() => setIsDropdownExpanded(!isDropdownExpanded)}
    >
      <DropdownLabel>{selectedOption?.label}</DropdownLabel>
      <i className="material-icons">arrow_drop_down</i>
      {renderDropdown()}
    </DropdownSelector>
  );
};

export default Dropdown;

const DropdownSelector = styled.div`
  font-size: 13px;
  font-weight: 500;
  position: relative;
  color: #ffffff;
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

const DropdownLabel = styled.div`
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 200px;
`;

const DropdownOverlay = styled.div`
  position: fixed;
  width: 100%;
  height: 100%;
  z-index: 10;
  left: 0px;
  top: 0px;
  cursor: default;
`;

const OptionWrapper = styled.div`
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
  box-shadow: 0px 4px 10px 0px #00000088;
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
