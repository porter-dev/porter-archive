import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {
  tooltipText: string;
};

type StateType = {
  showTooltip: boolean;
};

export default class TooltipParent extends Component<PropsType, StateType> {
  state = {
    showTooltip: false
  };

  renderTooltip = (): JSX.Element | undefined => {
    if (this.state.showTooltip) {
      return <Tooltip>{this.props.tooltipText}</Tooltip>;
    }
  };

  render() {
    return (
      <StyledTooltipParent
        onMouseOver={() => {
          this.setState({ showTooltip: true });
        }}
        onMouseOut={() => {
          this.setState({ showTooltip: false });
        }}
      >
        {this.props.children}
        {this.renderTooltip()}
      </StyledTooltipParent>
    );
  }
}

const Tooltip = styled.div`
  position: absolute;
  left: 10px;
  top: 20px;
  height: 18px;
  padding: 2px 5px;
  background: #383842dd;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: white;
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

const StyledTooltipParent = styled.div`
  position: relative;
`;
