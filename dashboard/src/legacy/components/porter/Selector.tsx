import React, { useState } from "react";
import styled from "styled-components";

import Loading from "components/Loading";

import { useOutsideClick } from "../../lib/hooks/UseOutsideClick";

export type SelectorPropsType<T> = {
  activeValue: T;
  refreshOptions?: () => void;
  options: Array<{ value: T; label: string; key: string; icon?: JSX.Element }>;
  createNew?: { openModal: (x: boolean) => void; label: string };
  setActiveValue: (x: T) => void;
  width: string;
  height?: string;
  disabled?: boolean;
  dropdownLabel?: string;
  dropdownWidth?: string;
  dropdownMaxHeight?: string;
  placeholder?: string;
  scrollBuffer?: boolean;
  isLoading?: boolean;
  label?: string;
};

const Selector = <T,>({
  activeValue,
  refreshOptions,
  options,
  createNew,
  setActiveValue,
  width,
  height,
  disabled,
  dropdownLabel,
  dropdownWidth,
  dropdownMaxHeight,
  placeholder,
  scrollBuffer,
  isLoading,
  label,
}: SelectorPropsType<T>): JSX.Element => {
  const [expanded, setExpanded] = useState(false);

  const ref = useOutsideClick(() => {
    setExpanded(false);
  });

  const renderOptionList = (): JSX.Element => {
    return (
      <>
        {options.map(
          (
            option: {
              value: T;
              label: string;
              key: string;
              icon?: JSX.Element;
            },
            i: number
          ) => {
            return (
              <Option
                key={option.key}
                height={height || ""}
                selected={option.value === activeValue}
                onClick={() => {
                  handleOptionClick(option);
                }}
                lastItem={i === options.length - 1}
              >
                {option.icon && <Icon>{option.icon}</Icon>}
                {option.label}
              </Option>
            );
          }
        )}
      </>
    );
  };

  const handleOptionClick = (option: { value: T; label: string }): void => {
    setActiveValue(option.value);
    setExpanded(false);
  };

  const renderDropdownLabel = (): JSX.Element | null => {
    if (!dropdownLabel) {
      return null;
    }

    return <DropdownLabel>{dropdownLabel}</DropdownLabel>;
  };

  const renderAddButton = (): JSX.Element | null => {
    if (!createNew) {
      return null;
    }

    return (
      <NewOption
        onClick={() => {
          createNew.openModal(true);
        }}
      >
        <Plus>+</Plus>
        {createNew.label}
      </NewOption>
    );
  };

  const renderDropdown = (): JSX.Element => {
    return (
      <DropdownWrapper>
        <Dropdown
          dropdownWidth={dropdownWidth || width}
          dropdownMaxHeight={dropdownMaxHeight || ""}
          onClick={() => {
            setExpanded(false);
          }}
        >
          {renderDropdownLabel()}
          {renderOptionList()}
          {renderAddButton()}
        </Dropdown>
        {scrollBuffer && <ScrollBuffer />}
      </DropdownWrapper>
    );
  };

  const getLabel = (value: T): string | undefined => {
    const tgt = options.find(
      (element: { value: T; label: string }) => element.value === value
    );
    if (tgt) {
      return tgt.label;
    }
  };

  const renderIcon = (): JSX.Element | null => {
    const icon = options.find((opt) => opt.icon && opt.value === activeValue);

    if (!icon) {
      return null;
    }

    return <Icon>{icon.icon}</Icon>;
  };

  return (
    <StyledSelector width={width} ref={ref}>
      {label && <Label>{label}</Label>}
      <MainSelector
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            if (refreshOptions) {
              refreshOptions();
            }
            setExpanded(!expanded);
          }
        }}
        expanded={expanded}
        width={width}
        height={height}
      >
        {isLoading ? (
          <Loading />
        ) : (
          <>
            <Flex>
              {renderIcon()}
              <TextWrap>
                {activeValue
                  ? activeValue === ""
                    ? "All"
                    : getLabel(activeValue)
                  : placeholder}
              </TextWrap>
            </Flex>
            <i className="material-icons">arrow_drop_down</i>
          </>
        )}
      </MainSelector>
      {expanded && renderDropdown()}
    </StyledSelector>
  );
};

export default Selector;

const Label = styled.div<{ color?: string }>`
  font-size: 13px;
  color: ${({ color = "#aaaabb" }) => color};
  margin-bottom: 10px;
`;

const DropdownWrapper = styled.div`
  position: absolute;
  width: 100%;
  right: 0;
  z-index: 1;
  top: calc(100% + 5px);
`;

const ScrollBuffer = styled.div`
  width: 100%;
  height: 50px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  width: 85%;
`;

const Icon = styled.div`
  height: 20px;
  width: 30px;
  margin-left: -5px;
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;

  > img {
    height: 18px;
    width: auto;
  }
`;

const Plus = styled.div`
  margin-right: 10px;
  font-size: 18px;
`;

const TextWrap = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 0;
`;

const DropdownLabel = styled.div`
  font-size: 13px;
  color: #ffffff44;
  font-weight: 500;
  margin: 10px 13px;
`;

const NewOption = styled.div`
  display: flex;
  width: 100%;
  border-top: 1px solid #00000000;
  border-bottom: 1px solid #ffffff00;
  height: 37px;
  font-size: 13px;
  align-items: center;
  padding-left: 15px;
  cursor: pointer;
  padding-right: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  :hover {
    background: #ffffff22;
  }
`;

type OptionProps = {
  selected: boolean;
  lastItem: boolean;
  height: string;
};

const Option = styled.div`
  width: 100%;
  border-top: 1px solid #00000000;
  border-bottom: 1px solid
    ${(props: OptionProps) => (props.lastItem ? "#ffffff00" : "#ffffff15")};
  height: ${(props: OptionProps) => props.height || "37px"};
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
  background: ${(props: OptionProps) => (props.selected ? "#ffffff11" : "")};

  :hover {
    background: #ffffff22;
  }
`;

const Dropdown = styled.div`
  background: #26282f;
  width: ${(props: { dropdownWidth: string; dropdownMaxHeight: string }) =>
    props.dropdownWidth};
  max-height: ${(props: { dropdownWidth: string; dropdownMaxHeight: string }) =>
    props.dropdownMaxHeight || "300px"};
  border-radius: 3px;
  z-index: 999;
  overflow-y: auto;
  margin-bottom: 20px;
  box-shadow: 0 8px 20px 0px #00000088;
`;

const StyledSelector = styled.div<{ width: string }>`
  position: relative;
  width: ${(props) => props.width};
`;

const MainSelector = styled.div<{
  disabled?: boolean;
  expanded: boolean;
  width: string;
  height?: string;
}>`
  width: ${(props) => props.width};
  height: ${(props) => (props.height ? props.height : "35px")};
  border: 1px solid #ffffff55;
  font-size: 13px;
  padding: 5px 10px;
  padding-left: 15px;
  border-radius: 3px;
  display: flex;
  color: ${(props) => (props.disabled ? "#ffffff44" : "#ffffff")};
  justify-content: space-between;
  align-items: center;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  background: ${(props) => (props.expanded ? "#ffffff33" : props.theme.fg)};
  :hover {
    background: ${(props) =>
      props.expanded
        ? "#ffffff33"
        : props.disabled
        ? "#ffffff11"
        : "#ffffff22"};
  }

  > i {
    font-size: 20px;
    transform: ${(props) => (props.expanded ? "rotate(180deg)" : "")};
  }
`;
