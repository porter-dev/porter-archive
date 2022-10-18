import React, { useState } from "react";
import styled from "styled-components";
import loading from "assets/loading.gif";
import Description from "./Description";

type MultiSelectOption = {
  text: string;
  onClick: () => void;
  description: string;
};

type Props = {
  options: MultiSelectOption[];

  disabled?: boolean;
  status?: string | null;
  color?: string;
  rounded?: boolean;
  helper?: string | null;
  saveText?: string | null;

  // Makes flush with corner if not within a modal
  makeFlush?: boolean;
  clearPosition?: boolean;
  statusPosition?: "right" | "left";
  // Provide the classname to modify styles from other components
  className?: string;
  successText?: string;
  expandTo?: OptionsWrapperProps["expandTo"];
};

const MultiSaveButton: React.FC<Props> = (props) => {
  const [currOptionIndex, setCurrOptionIndex] = useState<number>(0);

  const [isDropdownExpanded, setIsDropdownExpanded] = useState(false);

  const renderStatus = () => {
    if (props.status) {
      if (props.status === "successful") {
        return (
          <StatusWrapper position={props.statusPosition} successful={true}>
            <i className="material-icons">done</i>
            <StatusTextWrapper>
              {props?.successText || "Successfully updated"}
            </StatusTextWrapper>
          </StatusWrapper>
        );
      } else if (props.status === "loading") {
        return (
          <StatusWrapper position={props.statusPosition} successful={false}>
            <LoadingGif src={loading} />
            <StatusTextWrapper>
              {props.saveText || "Updating . . ."}
            </StatusTextWrapper>
          </StatusWrapper>
        );
      } else if (props.status === "error") {
        return (
          <StatusWrapper position={props.statusPosition} successful={false}>
            <i className="material-icons">error_outline</i>
            <StatusTextWrapper>Could not update</StatusTextWrapper>
          </StatusWrapper>
        );
      } else {
        return (
          <StatusWrapper position={props.statusPosition} successful={false}>
            <i className="material-icons">error_outline</i>
            <StatusTextWrapper>{props.status}</StatusTextWrapper>
          </StatusWrapper>
        );
      }
    } else if (props.helper) {
      return (
        <StatusWrapper position={props.statusPosition} successful={true}>
          {props.helper}
        </StatusWrapper>
      );
    }
  };

  const renderDropdown = () => {
    if (isDropdownExpanded) {
      return (
        <>
          <DropdownOverlay onClick={() => setIsDropdownExpanded(false)} />
          <OptionWrapper
            expandTo={props.expandTo || "right"}
            dropdownWidth="400px"
            dropdownMaxHeight="300px"
            onClick={() => setIsDropdownExpanded(false)}
          >
            {renderOptionList()}
          </OptionWrapper>
        </>
      );
    }
  };

  const renderOptionList = () => {
    return props.options.map((option, i, originalArray) => {
      return (
        <Option
          key={i}
          selected={option.text === originalArray[currOptionIndex]?.text}
          onClick={() => setCurrOptionIndex(i)}
          lastItem={i === originalArray.length - 1}
        >
          {option.text}
          <OptionDescription margin="8px 0 0 0">
            {option.description}
          </OptionDescription>
        </Option>
      );
    });
  };

  return (
    <DropdownSelector>
      <ButtonWrapper
        makeFlush={props.makeFlush}
        clearPosition={props.clearPosition}
        className={props.className}
      >
        {props.statusPosition !== "right" && <div>{renderStatus()}</div>}
        <Button
          rounded={props.rounded}
          disabled={props.disabled}
          onClick={props.options[currOptionIndex]?.onClick}
          color={props.color || "#5561C0"}
        >
          {props.options[currOptionIndex]?.text}
        </Button>
        <DropdownButton
          disabled={props.disabled}
          color={props.color || "#5561C0"}
          onClick={() => setIsDropdownExpanded(!isDropdownExpanded)}
        >
          <i className="material-icons expand-icon">
            {isDropdownExpanded ? "expand_less" : "expand_more"}
          </i>
        </DropdownButton>
        {props.statusPosition === "right" && <div>{renderStatus()}</div>}
      </ButtonWrapper>
      {renderDropdown()}
    </DropdownSelector>
  );
};

export default MultiSaveButton;

const LoadingGif = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 9px;
  margin-bottom: 0px;
`;

const StatusTextWrapper = styled.p`
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 19px;
  margin: 0;
`;

type StatusWrapperProps = {
  successful: boolean;
  position: "right" | "left";
};
// TODO: prevent status re-render on form refresh to allow animation
// animation: statusFloatIn 0.5s;
const StatusWrapper = styled.div<StatusWrapperProps>`
  display: flex;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #ffffff55;
  ${(props) => {
    if (props.position !== "right") {
      return "margin-right: 25px;";
    }
    return "margin-left: 25px;";
  }}
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;

  > i {
    font-size: 18px;
    margin-right: 10px;
    float: left;
    color: ${(props) => (props.successful ? "#4797ff" : "#fcba03")};
  }

  animation-fill-mode: forwards;

  @keyframes statusFloatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const ButtonWrapper = styled.div`
  ${(props: { makeFlush: boolean; clearPosition?: boolean }) => {
    const baseStyles = `
      display: flex;
      align-items: center;
      z-index: 99;
    `;

    if (props.clearPosition) {
      return baseStyles;
    }

    if (!props.makeFlush) {
      return `
        ${baseStyles}
        position: absolute;
        justify-content: flex-end;
        bottom: 25px;
        right: 27px;
        left: 27px;
      `;
    }
    return `
      ${baseStyles}
      position: absolute;
      justify-content: flex-end;
      bottom: 5px;
      right: 0;
    `;
  }}
`;

type ButtonProps = {
  disabled: boolean;
  color: string;
  rounded: boolean;
};

const Button = styled.button<ButtonProps>`
  height: 35px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  display: flex;
  align-items: center;
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: ${(props) => (props.rounded ? "100px" : "5px 0 0 5px")};
  background: ${(props) => (!props.disabled ? props.color : "#aaaabb")};
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 14px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 10px;
    margin-left: -5px;
    justify-content: center;
  }
`;

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

type OptionsWrapperProps = {
  expandTo: "left" | "right";
  dropdownWidth: string;
  dropdownMaxHeight: string;
};

const OptionWrapper = styled.div<OptionsWrapperProps>`
  position: absolute;
  ${(props) => (props.expandTo === "right" ? "left: 0" : "right: 0")};
  top: calc(100% + 10px);
  background: #26282f;
  width: ${(props) => props.dropdownWidth};
  max-height: ${(props) => props.dropdownMaxHeight || "300px"};
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
  font-size: 13px;
  padding-top: 9px;
  align-items: center;
  cursor: pointer;
  padding: 10px;
  background: ${(props: { selected: boolean; lastItem: boolean }) =>
    props.selected ? "#ffffff11" : ""};

  :hover {
    background: #ffffff22;
  }
`;

const DropdownButton = styled.div<{
  disabled: boolean;
  color: string;
}>`
  height: 35px;
  border-radius: 0 5px 5px 0;
  color: white;
  background: ${(props) => (!props.disabled ? props.color : "#aaaabb")};
  margin-left: 1px;
  padding: 9px;

  > i {
    font-size: 18px;
  }

  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }
`;

const OptionDescription = styled(Description)`
  font-weight: 400;
  line-height: 150%;
`;
