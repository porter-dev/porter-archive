import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import { ClusterType } from "shared/types";

import ClusterList from "./ClusterList";
import Loading from "components/Loading";
import NoClusterPlaceholder from "../NoClusterPlaceholder";

type PropsType = {
  currentCluster: ClusterType;
};

type StateType = {
  loading: boolean;
};

export default class ClusterPlaceholder extends Component<
  PropsType,
  StateType
> {
  state = {
    loading: true,
  };

  componentDidMount() {
    setTimeout(() => {
      this.setState({ loading: false });
    }, 100);
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps.currentCluster !== this.props.currentCluster) {
      this.setState({ loading: false });
    }
  }

  render() {
    if (this.state.loading || this.props.currentCluster?.id === -1) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (!this.props.currentCluster) {
      return <NoClusterPlaceholder />;
    } else {
      return <ClusterList currentCluster={this.props.currentCluster} />;
    }
  }
}

ClusterPlaceholder.contextType = Context;

const LoadingWrapper = styled.div`
  height: calc(100vh - 450px);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Highlight = styled.div`
  color: #8590ff;
  cursor: pointer;
  margin-left: 5px;
  margin-right: 10px;
`;

const StyledStatusPlaceholder = styled.div`
  width: 100%;
  height: calc(100vh - 470px);
  margin-top: 10px;
  display: flex;
  color: #aaaabb;
  border-radius: 5px;
  text-align: center;
  font-size: 13px;
  background: #ffffff09;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Work Sans", sans-serif;
  user-select: text;
`;
