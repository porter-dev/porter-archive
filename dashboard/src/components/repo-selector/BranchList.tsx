import { stringify } from 'querystring';
import React, { Component } from 'react';
import styled from 'styled-components';
import branch_icon from '../../assets/branch.png';

import api from '../../shared/api';
import { RepoType } from '../../shared/types';

import Loading from '../Loading';

type PropsType = {
  repoName: string,
  setSelectedBranch: (x: string) => void,
  selectedBranch: string
};

type StateType = {
  loading: boolean,
  error: boolean,
  branches: string[]
};

export default class BranchList extends Component<PropsType, StateType> {
  state = {
    selectedBranch: '',
    loading: true,
    error: false,
    branches: [] as string[]
  }

  componentDidMount() {

    // Get branches
    api.getBranches('<token>', {}, {
      kind: 'github',
      repo: this.props.repoName
    }, (err: any, res: any) => {
      if (err) {
        this.setState({ loading: false, error: true });
      } else {
        this.setState({ branches: res.data, loading: false, error: false });
      }
    });
  }

  renderBranchList = () => {
    let { branches, loading, error } = this.state;
    if (loading) {
      return <LoadingWrapper><Loading /></LoadingWrapper>
    } else if (error || !branches) {
      return <LoadingWrapper>Error loading branches</LoadingWrapper>
    }

    return branches.map((branch: string, i: number) => {
      return (
        <BranchName
          key={i}
          isSelected={branch === this.props.selectedBranch}
          lastItem={i === branches.length - 1}
          onClick={() => this.props.setSelectedBranch(branch)}
        >
          <img src={branch_icon} />{branch}
        </BranchName>
      );
    });
  }

  render() {
    return (
      <div>
        {this.renderBranchList()}
      </div>
    );
  }
}

const BranchName = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid ${(props: { lastItem: boolean, isSelected: boolean }) => props.lastItem ? '#00000000' : '#606166'};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: ${(props: { isSelected: boolean, lastItem: boolean }) => props.isSelected ? '#ffffff22' : '#ffffff11'};
  :hover {
    background: #ffffff22;

    > i {
      background: #ffffff22;
    }
  }

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
  }
`;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  background: #ffffff11;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
`;