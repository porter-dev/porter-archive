import React, { useContext, useState } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";
import JobResource from "./JobResource";
import useAuth from "shared/auth/useAuth";
import usePagination from "shared/hooks/usePagination";
import Selector from "components/Selector";

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
  const [deletionJob, setDeletionJob] = useState(null);

  const {
    firstContentIndex,
    lastContentIndex,
    nextPage,
    page,
    prevPage,
    totalPages,
    canNextPage,
    canPreviousPage,
  } = usePagination({
    count: props.jobs?.length,
    initialPageSize: 30,
  });

  const deleteJob = (job: any) => {
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
        setDeletionJob(job);
      })
      .catch((err) => {
        let parsedErr = err?.response?.data?.error;
        if (parsedErr) {
          err = parsedErr;
        }
        setCurrentError(err);
      })
      .finally(() => {
        setCurrentOverlay(null);
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
    <>
      <JobListWrapper>
        {props.jobs
          .slice(firstContentIndex, lastContentIndex)
          .map((job: any, i: number) => {
            return (
              <JobResource
                key={job?.metadata?.name}
                expandJob={props.expandJob}
                job={job}
                handleDelete={() => {
                  setCurrentOverlay({
                    message: "Are you sure you want to delete this job run?",
                    onYes: () => deleteJob(job),
                    onNo: () => setCurrentOverlay(null),
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
      <FlexEnd style={{ marginTop: "15px" }}>
        {/* Disable the page count selector until find a fix for their styles */}
        {/* <PageCountWrapper>
          Page size:
          <Selector
            activeValue={String(pageSize)}
            options={[
              {
                label: "10",
                value: "10",
              },
              {
                label: "20",
                value: "20",
              },
              {
                label: "50",
                value: "50",
              },
              {
                label: "100",
                value: "100",
              },
            ]}
            setActiveValue={(val) => setPageSize(Number(val))}
            width="70px"
          ></Selector>
        </PageCountWrapper> */}
        <PaginationActionsWrapper>
          <PaginationAction disabled={!canPreviousPage} onClick={prevPage}>
            {"<"}
          </PaginationAction>
          <PageCounter>
            Page {page} of {totalPages}
          </PageCounter>
          <PaginationAction disabled={!canNextPage} onClick={nextPage}>
            {">"}
          </PaginationAction>
        </PaginationActionsWrapper>
      </FlexEnd>
    </>
  );
};

export default JobListFC;

const FlexEnd = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
`;

const PaginationActionsWrapper = styled.div``;

const PageCountWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 160px;
  margin-right: 10px;
`;

const PaginationAction = styled.button`
  border: none;
  background: unset;
  color: white;
  padding: 10px;
  cursor: pointer;
  border-radius: 5px;
  :hover {
    background: #ffffff40;
  }

  :disabled {
    color: #ffffff88;
    cursor: unset;
    :hover {
      background: unset;
    }
  }
`;

const PageCounter = styled.span`
  margin: 0 5px;
`;

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
