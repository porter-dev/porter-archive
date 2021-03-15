import React, { Component } from "react";
import styled from "styled-components";

type PropsType = {
  text: string;
};

type StateType = {
  showTooltip: boolean;
};

export default class InfoTooltip extends Component<PropsType, StateType> {
  state = {
    showTooltip: false
  };

  render() {
    return (
      <StyledInfoTooltip>
        <i className="material-icons">help_outline</i>
      </StyledInfoTooltip>
    );
  }
}

const StyledInfoTooltip = styled.div`
  display: inline-block;
  position: relative;
  width: 26px;
  margin-right: 2px;

  > i {
    display: flex;
    align-items: center;
    position: absolute;
    top: -14px;
    font-size: 18px;
    right: -1px;
    color: #858faaaa;
    cursor: pointer;
    :hover {
      color: #aaaabb;
    }
  }
`;
