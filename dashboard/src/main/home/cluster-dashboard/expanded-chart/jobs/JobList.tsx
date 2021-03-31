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
  render() {
    return (
        <JobListWrapper>
            <StyledJobList>
          {this.props.jobs.map((job: any, i: number) => {
            return (
              <JobResource
                key={i}
                job={job}
              />
            );
          })}
        </StyledJobList>
        </JobListWrapper>
        
      );
  }
}

JobList.contextType = Context;

const JobListWrapper = styled.div`
  width: 100%;
  height: calc(100% - 70px);
  position: relative;
  font-size: 13px;
  padding: 0px;
  user-select: text;
  border-radius: 5px;
  overflow: hidden;
`

const StyledJobList = styled.div`
  overflow-y: scroll;
  width: 100%;
  height: 100%;
`;