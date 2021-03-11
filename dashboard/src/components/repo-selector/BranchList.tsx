import React, { Component } from "react";
import styled from "styled-components";
import branch_icon from "assets/branch.png";
import info from "assets/info.svg";

import api from "../../shared/api";
import { Context } from "../../shared/Context";
import { ActionConfigType } from "../..//shared/types";

import Loading from "../Loading";

type PropsType = {
  actionConfig: ActionConfigType;
  setBranch: (x: string) => void;
};

type StateType = {
  loading: boolean;
  error: boolean;
  branches: string[];
};

export default class BranchList extends Component<PropsType, StateType> {
  state = {
    loading: true,
    error: false,
    branches: [] as string[],
  };

  componentDidMount() {
    let { actionConfig } = this.props;
    let { currentProject } = this.context;

    // Get branches
    api
      .getBranches(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          git_repo_id: actionConfig.git_repo_id,
          kind: "github",
          owner: actionConfig.git_repo.split("/")[0],
          name: actionConfig.git_repo.split("/")[1],
        }
      )
      .then((res) =>
        this.setState({ branches: res.data, loading: false, error: false })
      )
      .catch((err) => {
        console.log(err);
        this.setState({ loading: false, error: true });
      });
  }

  renderBranchList = () => {
    let { branches, loading, error } = this.state;
    if (loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (error || !branches) {
      return <LoadingWrapper>Error loading branches</LoadingWrapper>;
    }

    return branches.map((branch: string, i: number) => {
      return (
        <BranchName
          key={i}
          lastItem={i === branches.length - 1}
          onClick={() => this.props.setBranch(branch)}
        >
          <img src={branch_icon} />
          {branch}
        </BranchName>
      );
    });
  };

  render() {
    return (
      <>
        <InfoRow lastItem={false}>
          <img src={info} />
          Select Branch
        </InfoRow>
        {this.renderBranchList()}
      </>
    );
  }
}

BranchList.contextType = Context;

const BranchName = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid
    ${(props: { lastItem: boolean }) =>
      props.lastItem ? "#00000000" : "#606166"};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: #ffffff11;
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

const InfoRow = styled(BranchName)`
  cursor: default;
  color: #ffffff55;
  :hover {
    background: #ffffff11;
  }
`;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  background: #ffffff11;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #ffffff44;
`;
