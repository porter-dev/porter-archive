import React, { Component } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";

export type SelectorPropsType = {
  activeValue: string;
  refreshOptions?: () => void;
  options: { value: string; label: string; icon?: any }[];
  addButton?: boolean;
  setActiveValue: (x: string) => void;
  width: string;
  height?: string;
  dropdownLabel?: string;
  dropdownWidth?: string;
  dropdownMaxHeight?: string;
  closeOverlay?: boolean;
  placeholder?: string;
  scrollBuffer?: boolean;
  disableTooltip?: boolean;
};

type StateType = {};

export default class Selector extends Component<SelectorPropsType, StateType> {
  state = {
    expanded: false,
    showTooltip: false,
  };

  wrapperRef: any = React.createRef();
  parentRef: any = React.createRef();

  componentDidMount() {
    document.addEventListener("mousedown", this.handleClickOutside.bind(this));
  }

  componentWillUnmount() {
    document.removeEventListener(
      "mousedown",
      this.handleClickOutside.bind(this)
    );
  }

  handleClickOutside = (event: any) => {
    if (
      this.wrapperRef &&
      this.wrapperRef.current &&
      !this.wrapperRef.current.contains(event.target) &&
      this.parentRef &&
      this.parentRef.current &&
      !this.parentRef.current.contains(event.target)
    ) {
      this.setState({ expanded: false });
    }
  };

  handleOptionClick = (option: { value: string; label: string }) => {
    this.props.setActiveValue(option.value);
    this.props.closeOverlay ? null : this.setState({ expanded: false });
  };

  renderOptionList = () => {
    let { options, activeValue } = this.props;
    return options.map(
      (option: { value: string; label: string; icon?: any }, i: number) => {
        return (
          <Option
            key={i}
            height={this.props.height}
            selected={option.value === activeValue}
            onClick={() => this.handleOptionClick(option)}
            lastItem={i === options.length - 1}
          >
            {option.icon && (
              <Icon>
                <img src={option.icon} />
              </Icon>
            )}
            {option.label}
          </Option>
        );
      }
    );
  };

  renderDropdownLabel = () => {
    if (this.props.dropdownLabel && this.props.dropdownLabel !== "") {
      return <DropdownLabel>{this.props.dropdownLabel}</DropdownLabel>;
    }
  };

  renderAddButton = () => {
    if (this.props.addButton) {
      return (
        <NewOption
          onClick={() => {
            this.context.setCurrentModal("NamespaceModal", this.props.options);
          }}
        >
          <Plus>+</Plus>
          Add namespace
        </NewOption>
      );
    }
  };

  renderDropdown = () => {
    if (this.state.expanded) {
      return (
        <DropdownWrapper>
          <Dropdown
            ref={this.wrapperRef}
            dropdownWidth={
              this.props.dropdownWidth
                ? this.props.dropdownWidth
                : this.props.width
            }
            dropdownMaxHeight={this.props.dropdownMaxHeight}
            onClick={() => this.setState({ expanded: false })}
          >
            {this.renderDropdownLabel()}
            {this.renderOptionList()}
            {this.renderAddButton()}
          </Dropdown>
          {this.props.scrollBuffer && <ScrollBuffer />}
        </DropdownWrapper>
      );
    }
  };

  getLabel = (value: string): any => {
    let tgt = this.props.options.find(
      (element: { value: string; label: string }) => element.value === value
    );
    if (tgt) {
      return tgt.label;
    }
  };

  renderIcon = () => {
    var icon;
    this.props.options.forEach((option: any) => {
      if (option.icon && option.value === this.props.activeValue) {
        icon = option.icon;
      }
    });
    return (
      <>
        {icon && (
          <Icon>
            <img src={icon} />
          </Icon>
        )}
      </>
    );
  };

  render() {
    let { activeValue } = this.props;

    return (
      <StyledSelector width={this.props.width}>
        <MainSelector
          ref={this.parentRef}
          onClick={() => {
            if (this.props.refreshOptions) {
              this.props.refreshOptions();
            }
            this.setState({ expanded: !this.state.expanded });
          }}
          expanded={this.state.expanded}
          width={this.props.width}
          height={this.props.height}
          onMouseEnter={() => this.setState({ showTooltip: true })}
          onMouseLeave={() => this.setState({ showTooltip: false })}
        >
          <Flex>
            {this.renderIcon()}
            <TextWrap>
              {activeValue
                ? activeValue === ""
                  ? "All"
                  : this.getLabel(activeValue)
                : this.props.placeholder}
            </TextWrap>
          </Flex>
          <i className="material-icons">arrow_drop_down</i>
        </MainSelector>
        {!this.props.disableTooltip && this.state.showTooltip && (
          <Tooltip>
            {activeValue
              ? activeValue === ""
                ? "All"
                : this.getLabel(activeValue)
              : this.props.placeholder}
          </Tooltip>
        )}
        {this.renderDropdown()}
      </StyledSelector>
    );
  }
}

Selector.contextType = Context;

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
  font-size: 15px;
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

const CloseOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
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

const MainSelector = styled.div`
  width: ${(props: { expanded: boolean; width: string; height?: string }) =>
    props.width};
  height: ${(props: { expanded: boolean; width: string; height?: string }) =>
    props.height ? props.height : "35px"};
  border: 1px solid #ffffff55;
  font-size: 13px;
  padding: 5px 10px;
  padding-left: 15px;
  border-radius: 3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: ${(props: {
    expanded: boolean;
    width: string;
    height?: string;
  }) => (props.expanded ? "#ffffff33" : "#ffffff11")};
  :hover {
    background: ${(props: {
      expanded: boolean;
      width: string;
      height?: string;
    }) => (props.expanded ? "#ffffff33" : "#ffffff22")};
  }

  > i {
    font-size: 20px;
    transform: ${(props: {
      expanded: boolean;
      width: string;
      height?: string;
    }) => (props.expanded ? "rotate(180deg)" : "")};
  }
`;

const Tooltip = styled.div`
  position: absolute;
  left: 5px;
  word-wrap: break-word;
  top: 40px;
  min-height: 18px;
  width: fit-content;
  padding: 5px 7px;
  background: #272731;
  z-index: 999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  color: white;
  text-transform: none;
  font-size: 12px;
  font-family: "Work Sans", sans-serif;
  outline: 1px solid #ffffff55;
  opacity: 0;
  animation: faded-in 0.2s 0.15s;
  animation-fill-mode: forwards;
  @keyframes faded-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
