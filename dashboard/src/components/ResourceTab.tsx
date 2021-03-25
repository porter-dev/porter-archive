import React, { Component } from "react";
import styled from "styled-components";

import { kindToIcon } from "shared/rosettaStone";

type PropsType = {
  label: string;
  name: string;
  handleClick?: () => void;
  selected?: boolean;
  isLast?: boolean;
  roundAllCorners?: boolean;
  status?: {
    label: string;
    available?: number;
    total?: number;
  } | null;
  expanded?: boolean;
};

type StateType = {
  expanded: boolean;
  showTooltip: boolean;
};

export default class ResourceTab extends Component<PropsType, StateType> {
  state = {
    expanded: this.props.expanded || false,
    showTooltip: false
  };

  renderDropdownIcon = () => {
    if (this.props.children) {
      return (
        <DropdownIcon expanded={this.state.expanded}>
          <i className="material-icons">arrow_right</i>
        </DropdownIcon>
      );
    }
  };

  renderIcon = (kind: string) => {
    let icon = "tonality";
    if (Object.keys(kindToIcon).includes(kind)) {
      icon = kindToIcon[kind];
    }

    return (
      <IconWrapper>
        <i className="material-icons">{icon}</i>
      </IconWrapper>
    );
  };

  renderTooltip = (x: string): JSX.Element | undefined => {
    if (this.state.showTooltip) {
      return <Tooltip>{x}</Tooltip>;
    }
  };

  getStatusText = () => {
    let { status } = this.props;
    if (status.available && status.total) {
      return `${status.available}/${status.total}`;
    } else if (status.label) {
      return status.label;
    }
  };

  renderStatus = () => {
    let { status } = this.props;
    if (status) {
      return (
        <Status>
          {this.getStatusText()}

          <StatusColor status={status.label} />
        </Status>
      );
    }
  };

  renderExpanded = () => {
    if (this.props.children && this.state.expanded) {
      return <ExpandWrapper>{this.props.children}</ExpandWrapper>;
    }
  };

  render() {
    let {
      label,
      name,
      children,
      isLast,
      handleClick,
      selected,
      status,
      roundAllCorners
    } = this.props;
    return (
      <StyledResourceTab
        isLast={isLast}
        onClick={() => handleClick && handleClick()}
        roundAllCorners={roundAllCorners}
      >
        <ResourceHeader
          hasChildren={children && true}
          expanded={this.state.expanded || selected}
          onClick={() => {
            if (children) {
              this.setState({ expanded: !this.state.expanded });
            }
          }}
        >
          <Info>
            {this.renderDropdownIcon()}
            <Metadata hasStatus={status && true}>
              {this.renderIcon(label)}
              {label}
              <ResourceName
                showKindLabels={true}
                onMouseOver={() => {
                  this.setState({ showTooltip: true });
                }}
                onMouseOut={() => {
                  this.setState({ showTooltip: false });
                }}
              >
                {name}
              </ResourceName>
              {this.renderTooltip(name)}
            </Metadata>
          </Info>
          {this.renderStatus()}
        </ResourceHeader>
        {this.renderExpanded()}
      </StyledResourceTab>
    );
  }
}

const StyledResourceTab = styled.div`
  width: 100%;
  margin-bottom: 2px;
  background: #ffffff11;
  border-bottom-left-radius: ${(props: {
    isLast: boolean;
    roundAllCorners: boolean;
  }) => (props.isLast ? "5px" : "")};
  border-bottom-right-radius: ${(props: {
    isLast: boolean;
    roundAllCorners: boolean;
  }) => (props.roundAllCorners && props.isLast ? "5px" : "")};
`;

const Tooltip = styled.div`
  position: absolute;
  right: 0px;
  top: 25px;
  white-space: nowrap;
  height: 18px;
  padding: 2px 5px;
  background: #383842dd;
  display: flex;
  align-items: center;
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

const ExpandWrapper = styled.div``;

const ResourceHeader = styled.div`
  width: 100%;
  height: 50px;
  display: flex;
  font-size: 13px;
  align-items: center;
  justify-content: space-between;
  color: #ffffff66;
  user-select: none;
  padding: 8px 18px;
  padding-left: ${(props: { expanded: boolean; hasChildren: boolean }) =>
    props.hasChildren ? "10px" : "22px"};
  cursor: pointer;
  background: ${(props: { expanded: boolean; hasChildren: boolean }) =>
    props.expanded ? "#ffffff11" : ""};
  :hover {
    background: #ffffff18;

    > i {
      background: #ffffff22;
    }
  }
`;

const Info = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 80%;
  height: 100%;
`;

const Metadata = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  max-width: ${(props: { hasStatus: boolean }) =>
    props.hasStatus ? "calc(100% - 20px)" : "100%"};
`;

const Status = styled.div`
  display: flex;
  width; 20%;
  font-size: 12px;
  text-transform: capitalize;
  justify-content: flex-end;
  align-items: center;
  font-family: 'Work Sans', sans-serif;
  color: #aaaabb;
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from { opacity: 0 }
    to { opacity: 1 }
  }
`;

const StatusColor = styled.div`
  margin-left: 12px;
  width: 8px;
  min-width: 8px;
  height: 8px;
  background: ${(props: { status: string }) =>
    props.status === "running" ||
    props.status === "Ready" ||
    props.status === "Completed"
      ? "#4797ff"
      : props.status === "failed" || props.status === "FailedValidation"
      ? "#ed5f85"
      : props.status === "completed"
      ? "#00d12a"
      : "#f5cb42"};
  border-radius: 20px;
`;

const ResourceName = styled.div`
  color: #ffffff;
  max-width: 40%;
  margin-left: ${(props: { showKindLabels: boolean }) =>
    props.showKindLabels ? "10px" : ""};
  text-transform: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const IconWrapper = styled.div`
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 15px;
    color: #ffffff;
    margin-right: 14px;
  }
`;

const DropdownIcon = styled.div`
  > i {
    margin-top: 2px;
    margin-right: 11px;
    font-size: 20px;
    color: #ffffff66;
    cursor: pointer;
    border-radius: 20px;
    background: ${(props: { expanded: boolean }) =>
      props.expanded ? "#ffffff18" : ""};
    transform: ${(props: { expanded: boolean }) =>
      props.expanded ? "rotate(180deg)" : ""};
    animation: ${(props: { expanded: boolean }) =>
      props.expanded ? "quarterTurn 0.3s" : ""};
    animation-fill-mode: forwards;

    @keyframes quarterTurn {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(90deg);
      }
    }
  }
`;
