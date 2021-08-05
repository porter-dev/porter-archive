import React, { Component } from "react";
import styled from "styled-components";

import api from "shared/api";
import _ from "lodash";
import { Context } from "shared/Context";
import JobResource from "./JobResource";
import ConfirmOverlay from "components/ConfirmOverlay";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";

type PropsType = WithAuthProps & {
  jobs: any[];
  setJobs: (job: any) => void;
};

type StateType = {
  deletionCandidate: any;
  deletionJob: any;
};

class JobList extends Component<PropsType, StateType> {
  state = {
    deletionCandidate: null as any,
    deletionJob: null as any,
  };

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
            return (
              <JobResource
                key={job?.metadata?.name}
                job={job}
                handleDelete={() => this.setState({ deletionCandidate: job })}
                deleting={
                  this.state.deletionJob?.metadata?.name == job.metadata?.name
                }
                readOnly={
                  !this.props.isAuthorized("job", "", [
                    "get",
                    "update",
                    "delete",
                  ])
                }
              />
            );
          })}
        </>
      );
    }
  };

  deleteJob = () => {
    let { currentCluster, currentProject, setCurrentError } = this.context;
    let job = this.state.deletionCandidate;

    api
      .deleteJob(
        "<token>",
        {
          cluster_id: currentCluster.id,
        },
        {
          id: currentProject.id,
          name: job.metadata?.name,
          namespace: job.metadata?.namespace,
        }
      )
      .then((res) => {
        this.setState({
          deletionJob: this.state.deletionCandidate,
          deletionCandidate: null,
        });
      })
      .catch((err) => {
        let parsedErr =
          err?.response?.data?.errors && err.response.data.errors[0];
        if (parsedErr) {
          err = parsedErr;
        }
        setCurrentError(err);
      });
  };

  render() {
    return (
      <>
        <ConfirmOverlay
          show={this.state.deletionCandidate}
          message={`Are you sure you want to delete this job run?`}
          onYes={this.deleteJob}
          onNo={() => this.setState({ deletionCandidate: null })}
        />
        <JobListWrapper>{this.renderJobList()}</JobListWrapper>
      </>
    );
  }
}

JobList.contextType = Context;

export default withAuth(JobList);

const Placeholder = styled.div`
  width: 100%;
  min-height: 250px;
  height: 30vh;
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
