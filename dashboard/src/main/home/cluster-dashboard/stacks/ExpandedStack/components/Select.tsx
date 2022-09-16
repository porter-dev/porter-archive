import Loading from "components/Loading";
import React, { useRef, useState } from "react";
import { useOutsideAlerter } from "shared/hooks/useOutsideAlerter";
import styled from "styled-components";

export type SelectProps<T> = {
  value: T;
  options: T[];
  accessor: (option: T) => string | React.ReactNode;
  onChange: (value: T) => void;
  isOptionEqualToValue?: (option: T, value: T) => boolean;
  label: string;
  isLoading?: boolean;
  dropdown?: {
    maxH?: string;
    width?: string;
    label?: string;
    option?: {
      height?: string;
    };
  };
  placeholder: string;
  className?: string;
  readOnly?: boolean;
};

const Select = <T extends unknown>({
  value,
  options,
  accessor,
  onChange,
  isOptionEqualToValue,
  label,
  isLoading,
  placeholder,
  dropdown,
  className,
  readOnly,
}: SelectProps<T>) => {
  const wrapperRef = useRef();
  const [expanded, setExpanded] = useState(false);

  useOutsideAlerter(wrapperRef, () => {
    setExpanded(false);
  });

  const handleOptionClick = (value: T) => {
    setExpanded(false);
    onChange(value);
  };

  const getLabel = () => {
    if (label) {
      return <SelectStyles.Label> {label} </SelectStyles.Label>;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div>
        {getLabel()}
        <SelectStyles.Wrapper>
          <SelectStyles.Selector
            className={className}
            expanded={false}
            readOnly={readOnly}
          >
            <SelectStyles.Loading>
              <Loading />
            </SelectStyles.Loading>
          </SelectStyles.Selector>
        </SelectStyles.Wrapper>
      </div>
    );
  }

  const isSelected = (option: T, value: T) => {
    if (!value) {
      return false;
    }

    if (isOptionEqualToValue) {
      return isOptionEqualToValue(option, value);
    }
  };

  return (
    <div>
      {getLabel()}
      <SelectStyles.Wrapper ref={wrapperRef}>
        <SelectStyles.Selector
          className={className}
          onClick={() => setExpanded(!expanded)}
          expanded={!readOnly && expanded}
          readOnly={readOnly}
        >
          <SelectStyles.CurrentValue>
            <span>{value ? accessor(value) : placeholder}</span>
          </SelectStyles.CurrentValue>
          {readOnly ? null : <i className="material-icons">arrow_drop_down</i>}
        </SelectStyles.Selector>
        {expanded && !readOnly ? (
          <SelectStyles.Dropdown.Wrapper
            width={dropdown?.width}
            maxH={dropdown?.maxH}
          >
            {dropdown?.label && (
              <SelectStyles.Dropdown.Label>
                {dropdown?.label}
              </SelectStyles.Dropdown.Label>
            )}
            {options.length > 0 ? (
              <>
                {options.map((option, i) => (
                  <SelectStyles.Dropdown.Option
                    key={i}
                    onClick={() => !readOnly && handleOptionClick(option)}
                    lastItem={i === options.length - 1}
                    selected={isSelected(option, value)}
                    height={dropdown?.option?.height}
                  >
                    {accessor(option)}
                  </SelectStyles.Dropdown.Option>
                ))}
              </>
            ) : (
              <SelectStyles.Dropdown.NoOptions>
                No options available
              </SelectStyles.Dropdown.NoOptions>
            )}
          </SelectStyles.Dropdown.Wrapper>
        ) : null}
      </SelectStyles.Wrapper>
    </div>
  );
};

export default Select;

export const SelectStyles = {
  Wrapper: styled.div`
    position: relative;
  `,
  Label: styled.div`
    color: #ffffff;
    margin-bottom: 10px;
    margin-top: 20px;
    font-size: 13px;
  `,

  Selector: styled.div<{ expanded: boolean; readOnly: boolean }>`
    height: 35px;
    border: 1px solid #ffffff55;
    font-size: 13px;
    color: ${(props) => (props.readOnly ? "#ffffff44" : "")};
    padding: 5px 10px;
    padding-left: 15px;
    border-radius: 3px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: ${(props) => (props.readOnly ? "not-allowed" : "pointer")};
    background: ${(props) => {
      if (props.expanded) {
        return "#ffffff33";
      }
      return "#ffffff11";
    }};

    :hover {
      background: ${(props) => {
        if (props.readOnly) {
          return "#ffffff11";
        } else if (props.expanded) {
          return "#ffffff33";
        }
        return "#ffffff22";
      }};
    }

    > i {
      font-size: 20px;
      transform: ${(props) => (props.expanded ? "rotate(180deg)" : "")};
    }
  `,

  Loading: styled.div`
    width: 100%;
  `,

  CurrentValue: styled.div`
    display: flex;
    align-items: center;
    width: 85%;

    > span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      z-index: 0;
    }
  `,

  Dropdown: {
    Wrapper: styled.div<{ width: string; maxH?: string }>`
      background: #26282f;
      width: ${(props) => props.width || "100%"};
      max-height: ${(props) => props.maxH || "300px"};
      border-radius: 3px;
      z-index: 999;
      overflow-y: auto;
      margin-bottom: 20px;
      box-shadow: 0 8px 20px 0px #00000088;
      position: absolute;
    `,
    Option: styled.div<{
      selected: boolean;
      lastItem: boolean;
      height?: string;
    }>`
      width: 100%;
      border-top: 1px solid #00000000;
      border-bottom: 1px solid
        ${(props) => (props.lastItem ? "#ffffff00" : "#ffffff15")};
      height: ${(props) => props.height || "37px"};
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
      background: ${(props) => (props.selected ? "#ffffff11" : "")};

      :hover {
        background: #ffffff22;
      }
    `,
    Label: styled.div`
      font-size: 13px;
      color: #ffffff44;
      font-weight: 500;
      margin: 10px 13px;
    `,
    NoOptions: styled.div`
      font-size: 13px;
      color: #ffffff44;
      font-weight: 500;
      margin: 10px 13px;
      :not(:first-child) {
        border-top: 1px solid #ffffff15;
      }
    `,
  },
};
