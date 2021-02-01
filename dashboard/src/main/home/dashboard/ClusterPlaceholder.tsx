import React, { Component } from 'react';
import styled from 'styled-components';

import api from '../../../shared/api';
import { Context } from '../../../shared/Context';
import { ClusterType } from '../../../shared/types';

import ClusterList from './ClusterList';
import Loading from '../../../components/Loading';

type PropsType = {
  currentCluster: ClusterType,
  setCurrentView: (x: string) => void,
};

type StateType = {
  loading: boolean,
};

export default class ClusterPlaceholder extends Component<PropsType, StateType> {
  state = {
    loading: true,
  }

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
    if (this.state.loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (!this.props.currentCluster) {
      return (
        <>
          <Banner>
            <i className="material-icons">error_outline</i>
            This project currently has no clusters connected.
          </Banner>
          <StyledStatusPlaceholder>
            <Highlight onClick={() => {
              this.context.setCurrentModal('ClusterInstructionsModal', {});
            }}>
              + Connect a Cluster
            </Highlight>
          </StyledStatusPlaceholder>
        </>
      );
    } else {
      return (
        <ClusterList setCurrentView={this.props.setCurrentView} />
      );
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
  margin-left: 10px;
  margin-right: 10px;
`;

const Banner = styled.div`
  height: 40px;
  width: 100%;
  margin: 15px 0;
  font-size: 13px;
  display: flex;
  border-radius: 5px;
  padding-left: 15px;
  align-items: center;
  background: #ffffff11;
  > i {
    margin-right: 10px;
    font-size: 18px;
  }
`;

const StyledStatusPlaceholder = styled.div`
  width: 100%;
  height: calc(100vh - 450px);
  margin-top: 30px;
  display: flex;
  align-items: center;
  color: #aaaabb;
  border-radius: 5px;
  text-align: center;
  font-size: 13px;
  padding-bottom: 25px;
  background: #ffffff09;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Work Sans', sans-serif;
  user-select: text;
`;