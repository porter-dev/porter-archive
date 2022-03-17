import React, { useContext, useState } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";
import JobResource from "./JobResource";
import useAuth from "shared/auth/useAuth";

type PropsType = {
  jobs: any[];
  setJobs: (job: any) => void;
  expandJob: any;
  currentChartVersion: number;
  latestChartVersion: number;
  isDeployedFromGithub: boolean;
  repositoryUrl?: string;
};

const JobListFC = (props: PropsType): JSX.Element => {
  const [isAuthorized] = useAuth();
  const {
    currentCluster,
    currentProject,
    setCurrentOverlay,
    setCurrentError,
  } = useContext(Context);
  const [deletionCandidate, setDeletionCandidate] = useState(null);
  const [deletionJob, setDeletionJob] = useState(null);

  const deleteJob = () => {
    let job = deletionCandidate;
    setCurrentOverlay(null);
    api
      .deleteJob(
        "<token>",
        {},
        {
          id: currentProject.id,
          name: job.metadata?.name,
          cluster_id: currentCluster.id,
          namespace: job.metadata?.namespace,
        }
      )
      .then((res) => {
        setDeletionJob(deletionCandidate);
        setDeletionCandidate(null);
      })
      .catch((err) => {
        let parsedErr = err?.response?.data?.error;
        if (parsedErr) {
          err = parsedErr;
        }
        setCurrentError(err);
      });
  };

  if (!props.jobs?.length) {
    return (
      <JobListWrapper>
        <Placeholder>
          <i className="material-icons">category</i>
          There are no jobs currently running.
        </Placeholder>
      </JobListWrapper>
    );
  }

  return (
    <JobListWrapper>
      {props.jobs.map((job: any, i: number) => {
        return (
          <JobResource
            key={job?.metadata?.name}
            expandJob={props.expandJob}
            job={job}
            handleDelete={() => {
              setDeletionCandidate(job);
              setCurrentOverlay({
                message: "Are you sure you want to delete this job run?",
                onYes: deleteJob,
                onNo: () => {
                  setDeletionCandidate(null);
                  setCurrentOverlay(null);
                },
              });
            }}
            deleting={deletionJob?.metadata?.name == job.metadata?.name}
            readOnly={!isAuthorized("job", "", ["get", "update", "delete"])}
            isDeployedFromGithub={props.isDeployedFromGithub}
            repositoryUrl={props.repositoryUrl}
            currentChartVersion={props.currentChartVersion}
            latestChartVersion={props.latestChartVersion}
          />
        );
      })}
    </JobListWrapper>
  );
};

export default JobListFC;

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
