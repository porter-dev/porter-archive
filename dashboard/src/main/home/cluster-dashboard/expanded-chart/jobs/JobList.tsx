import React, { Component } from "react";
import styled from "styled-components";

import _ from "lodash";
import { Context } from "shared/Context";
import JobResource from "./JobResource";

type PropsType = {
  jobs: any[];
};

type StateType = {};

export default class JobList extends Component<PropsType, StateType> {
  renderJobList = () => {
    if (this.props.jobs.length === 0) {
      return (
        <Placeholder>
          <i className="material-icons">category</i>
          There are no jobs currently running.
        </Placeholder>
      );
    } else {
      return (
        <>
          {this.props.jobs.map((job: any, i: number) => {
            return <JobResource key={job?.metadata?.name} job={job} />;
          })}
        </>
      );
    }
  };

  render() {
    return <JobListWrapper>{this.renderJobList()}</JobListWrapper>;
  }
}

JobList.contextType = Context;

const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  font-size: 14px;

  > i {
    font-size: 18px;
    margin-right: 10px;
  }
`;

const JobListWrapper = styled.div`
  width: 100%;
  height: calc(100% - 65px);
  position: relative;
  font-size: 13px;
  padding: 0px;
  user-select: text;
  border-radius: 5px;
  overflow-y: auto;
`;
