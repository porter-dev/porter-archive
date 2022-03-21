import React, { useContext, useMemo, useState } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";
import JobResource from "./JobResource";
import useAuth from "shared/auth/useAuth";
import usePagination from "shared/hooks/usePagination";
import Selector from "components/Selector";
import DisplaySwitch from "components/DisplaySwitch";
import { CellProps, Column } from "react-table";
import { dateFormatter, JobRun, runnedFor } from "../../chart/JobRunTable";

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
  const [view, setView] = useState<"table" | "list">("list");

  const {
    firstContentIndex,
    lastContentIndex,
    nextPage,
    page,
    prevPage,
    totalPages,
    pageSize,
    setPageSize,
    canNextPage,
    canPreviousPage,
  } = usePagination({
    count: props.jobs?.length,
    initialPageSize: 30,
  });

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
    <>
      <DisplaySwitch
        onChange={(option) => {
          setView(option);
        }}
        value={view}
      />
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

type JobTableRendererType = {
  jobs: JobRun[];
  handleDelete: () => void;
  deletionJob: JobRun;
  currentChartVersion: number;
  latestChartVersion: number;
  isDeployedFromGithub: boolean;
  repositoryUrl?: string;
};

const JobTableRenderer = (props: JobTableRendererType): JSX.Element => {
  const { currentProject, currentCluster } = useContext(Context);

  const columns = useMemo<Column<JobRun>[]>(
    () => [
      {
        Header: "Namespace / Name",
        accessor: (originalRow) => {
          const owners = originalRow.metadata.ownerReferences;
          let name = "N/A";
          if (Array.isArray(owners)) {
            name = owners[0]?.name;
          }
          if (originalRow?.metadata?.labels["meta.helm.sh/release-name"]) {
            name = originalRow.metadata.labels["meta.helm.sh/release-name"];
          }

          if (name !== "N/A") {
            return originalRow.metadata?.namespace + "/" + name;
          }

          return name;
        },
        width: "max-content",
      },
      {
        Header: "Run at",
        accessor: (originalRow) => dateFormatter(originalRow.status.startTime),
      },
      {
        Header: "Run for",
        accessor: (originalRow) => {
          if (originalRow.status?.completionTime) {
            return originalRow.status?.completionTime;
          } else if (
            Array.isArray(originalRow.status?.conditions) &&
            originalRow.status?.conditions[0]?.lastTransitionTime
          ) {
            return originalRow.status?.conditions[0]?.lastTransitionTime;
          } else {
            return "Still running...";
          }
        },
        Cell: ({ row }: CellProps<JobRun>) => {
          if (row.original.status?.completionTime) {
            return runnedFor(
              row.original.status?.startTime,
              row.original.status?.completionTime
            );
          } else if (
            Array.isArray(row.original.status?.conditions) &&
            row.original.status?.conditions[0]?.lastTransitionTime
          ) {
            return runnedFor(
              row.original.status?.startTime,
              row.original.status?.conditions[0]?.lastTransitionTime
            );
          } else {
            return "Still running...";
          }
        },
        styles: {
          padding: "10px",
        },
      },
      {
        Header: "Status",
        id: "status",
        Cell: ({ row }: CellProps<JobRun>) => {
          if (row.original.status?.succeeded >= 1) {
            return <Status color="#38a88a">Succeeded</Status>;
          }

          if (row.original.status?.failed >= 1) {
            return <Status color="#cc3d42">Failed</Status>;
          }

          return <Status color="#ffffff11">Running</Status>;
        },
      },
      {
        Header: "Commit/Image tag",
        id: "commit_or_image_tag",
        accessor: (originalRow) => {
          const container = originalRow.spec?.template?.spec?.containers[0];
          return container?.image?.split(":")[1] || "N/A";
        },
        Cell: ({ row }: CellProps<JobRun>) => {
          const container = row.original.spec?.template?.spec?.containers[0];

          const tag = container?.image?.split(":")[1];
          return tag;
        },
      },
      {
        Header: "Command",
        id: "command",
        accessor: (originalRow) => {
          const container = originalRow.spec?.template?.spec?.containers[0];
          return container?.command?.join(" ") || "N/A";
        },
        Cell: ({ row }: CellProps<JobRun>) => {
          const container = row.original.spec?.template?.spec?.containers[0];

          return (
            <CommandString>
              {container?.command?.join(" ") || "N/A"}
            </CommandString>
          );
        },
      },
      {
        id: "delete",
        Cell: ({ row }: CellProps<JobRun>) => {
          return (
            <i
              className="material-icons"
              onClick={(e) => {
                e.stopPropagation();
                props.handleDelete();
              }}
            >
              delete
            </i>
          );
        },
        maxWidth: 40,
      },
    ],
    []
  );

  const data = useMemo(() => {}, [props.jobs]);

  return <></>;
};

const CommandString = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
  color: #ffffff55;
  margin-right: 27px;
  font-family: monospace;
`;

const Status = styled.div<{ color: string }>`
  padding: 5px 10px;
  background: ${(props) => props.color};
  font-size: 13px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min-content;
  height: 25px;
  min-width: 90px;
`;

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
