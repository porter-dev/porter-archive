import _ from "lodash";
import React, { useMemo, useState } from "react";
import styled from "styled-components";

type Props = {
  options: any[];
  onSelect: (option: any) => void;
  label?: string;
  dropdownLabel?: string;
  getOptionLabel?: (option: any) => string;
  filterBy?: ((option: any) => string) | string;
  noOptionsText?: string;
  dropdownMaxHeight?: string;
  renderAddButton?: any;
  className?: string;
  renderOptionIcon?: (option: any) => React.ReactNode;
};

const SearchSelector = ({
  options,
  onSelect,
  label,
  dropdownLabel,
  getOptionLabel,
  filterBy,
  noOptionsText,
  dropdownMaxHeight,
  renderAddButton,
  className,
  renderOptionIcon,
}: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState("");

  const handleOptionClick = (e: any, option: any) => {
    setIsExpanded(false);
    onSelect(option);
    setFilter("");
  };

  const getLabel = (option: any) => {
    if (typeof getOptionLabel === "function") {
      return getOptionLabel(option);
    }

    return React.isValidElement(option) ? option : "";
  };

  const filteredOptions = useMemo(() => {
    if (typeof filterBy === "function") {
      return options.filter((option) => filterBy(option).includes(filter));
    }

    if (typeof filterBy === "string") {
      return options.filter((option) =>
        _.get(option, filterBy).includes(filter)
      );
    }

    return options.filter((option) => option.includes(filter));
  }, [filter, options]);

  return (
    <>
      {label?.length ? <Label>{label}</Label> : null}
      <InputWrapper
        onBlur={() => {
          setIsExpanded(false);
        }}
        className={className}
      >
        <Input
          value={filter}
          placeholder="Find or add a tag..."
          onClick={(e) => {
            setIsExpanded(false);
            e.stopPropagation();
            setIsExpanded(true);
          }}
          onChange={(e) => setFilter(e.target.value)}
        />
        {isExpanded ? (
          <DropdownWrapper>
            <Dropdown dropdownMaxHeight={dropdownMaxHeight}>
              {!filteredOptions.length ? (
                <>
                  {!renderAddButton ? (
                    <DropdownLabel>
                      {noOptionsText || "No options available for this filter"}
                    </DropdownLabel>
                  ) : (
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setFilter("");
                      }}
                    >
                      {renderAddButton()}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {renderAddButton && (
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setFilter("");
                      }}
                    >
                      {renderAddButton()}
                    </div>
                  )}
                  {!renderAddButton && dropdownLabel && (
                    <DropdownLabel>{dropdownLabel}</DropdownLabel>
                  )}
                  {filteredOptions.map((option, i) => (
                    <Option
                      key={i}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onClick={(e) => handleOptionClick(e, option)}
                    >
                      {typeof renderOptionIcon === "function"
                        ? renderOptionIcon(option)
                        : null}
                      {getLabel(option)}
                    </Option>
                  ))}
                </>
              )}
            </Dropdown>
          </DropdownWrapper>
        ) : null}
      </InputWrapper>
    </>
  );
};

export default SearchSelector;

const InputWrapper = styled.div`
  display: flex;
  margin-bottom: -1px;
  align-items: center;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  background: #ffffff11;
  position: relative;
  width: 100%;
`;

const Input = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: none;
  color: #ffffff;
  padding: 5px 10px;
  min-height: 35px;
  max-height: 45px;
  width: 100%;
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;

const DropdownWrapper = styled.div`
  position: absolute;
  width: 100%;
  right: 0;
  z-index: 9999;
  top: calc(100% + 5px);
`;

const Dropdown = styled.div`
  background: #26282f;

  max-height: ${(props: { dropdownMaxHeight: string }) =>
    props.dropdownMaxHeight || "300px"};
  border-radius: 3px;
  z-index: 999;
  overflow-y: auto;
  margin-bottom: 20px;
  box-shadow: 0 8px 20px 0px #00000088;
`;

const DropdownLabel = styled.div`
  font-size: 13px;
  color: #ffffff44;
  font-weight: 500;
  margin: 10px 13px;
`;

const Option = styled.div`
  width: 100%;
  border-top: 1px solid #00000000;
  border-bottom: 1px solid #ffffff15;
  min-height: 35px;
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

  :last-child {
    border-bottom: 1px solid #ffffff00;
  }

  :hover {
    background: #ffffff22;
  }
`;
