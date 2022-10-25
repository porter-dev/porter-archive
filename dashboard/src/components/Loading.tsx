import React, { Component } from "react";
import styled from "styled-components";
import loading from "assets/loading.gif";

type PropsType = {
  offset?: string;
  width?: string;
  height?: string;
  message?: string;
};

type StateType = {};

export default class Loading extends Component<PropsType, StateType> {
  state = {};

  render() {
    return (
      <StyledLoading
        offset={this.props.offset}
        width={this.props.width || "100%"}
        height={this.props.height || "100%"}
      >
        <Spinner src={loading} />
        {this.props.message ? (
          <StyledMessage>{this.props.message}</StyledMessage>
        ) : null}
      </StyledLoading>
    );
  }
}

const Spinner = styled.img`
  width: 20px;
`;

type StyleLoadingProps = PropsType;

const StyledLoading = styled.div`
  width: ${(props: StyleLoadingProps) => props.width};
  height: ${(props: StyleLoadingProps) => props.height};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin-top: ${(props: StyleLoadingProps) => props.offset};
`;

const StyledMessage = styled.div`
  margin-block: 15px;
  color: #aaaabb;
`;
