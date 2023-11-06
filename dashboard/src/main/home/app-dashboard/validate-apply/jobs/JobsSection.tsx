import React, { useState, useMemo } from "react";
import styled from "styled-components";

import history from "assets/history.png";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import { type JobRun, useJobs } from "lib/hooks/useJobs";
import Table from "components/OldTable";
import { type CellProps, type Column } from "react-table";
import { relativeDate, timeFrom } from "shared/string_utils";
import { useLocation } from "react-router";
import SelectRow from "components/form-components/SelectRow";
import Link from "components/porter/Link";
import { ranFor } from "./utils";
import JobRunDetails from "./JobRunDetails";
import TriggerJobButton from "./TriggerJobButton";

type Props = {
  appName: string;
  projectId: number;
  clusterId: number;
  deploymentTargetId: string;
  jobNames: string[];
};

const JobsSection: React.FC<Props> = ({
  appName,
  projectId,
  clusterId,
  deploymentTargetId,
  jobNames,
}) => {
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const serviceFromQueryParams = queryParams.get("service");
  const jobRunId = queryParams.get("job_run_id");
  const [selectedJobName, setSelectedJobName] = useState<string>(
    serviceFromQueryParams != null && jobNames.includes(serviceFromQueryParams) ? serviceFromQueryParams : "all"
  );

  const jobOptions = useMemo(() => {
    return [{ label: "All jobs", value: "all" }, ...jobNames.map((name) => {
      return {
        label: name,
        value: name,
      };
    })];
  }, [jobNames]);

  const { jobRuns, isLoadingJobRuns } = useJobs({
    appName,
    projectId,
    clusterId,
    deploymentTargetId,
    selectedJobName,
  });

  const selectedJobRun = useMemo(() => {
    return jobRuns.find((jr) => jr.metadata.uid === jobRunId);
  }, [jobRuns, jobRunId]);

  const columns = useMemo<Array<Column<JobRun>>>(
    () => [
      {
        Header: "Started",
        accessor: (originalRow) => relativeDate(originalRow?.status.startTime ?? ''),
      },
      {
        Header: "Run for",
        Cell: ({ row }) => {
          let ranForString = "Still running...";
          if (row.original.status.completionTime) {
            ranForString = ranFor(
              row.original.status.startTime ?? row.original.metadata.creationTimestamp,
              row.original.status.completionTime
            );
          } else if (row.original.status.conditions.length > 0 && row.original.status.conditions[0].lastTransitionTime) {
            ranForString = ranFor(
              row.original.status.startTime ?? row.original.metadata.creationTimestamp,
              row.original?.status?.conditions[0]?.lastTransitionTime
            );
          }

          return <div>{ranForString}</div>;
        },
      },
      {
        Header: "Name",
        id: "job_name",
        Cell: ({ row }: CellProps<JobRun>) => {
          return <div>{row.original.jobName}</div>;
        },
      },
      {
        Header: "Version",
        id: "version_number",
        Cell: ({ row }: CellProps<JobRun>) => {
          return <div>{row.original.revisionNumber}</div>;
        },
        maxWidth: 100,
        styles: {
          padding: "10px",
        }
      },
      {
        Header: "Status",
        id: "status",
        Cell: ({ row }: CellProps<JobRun>) => {
          if (row.original.status.succeeded != null && row.original.status.succeeded >= 1) {
            return <Status color="#38a88a">Succeeded</Status>;
          }

          if (row.original.status.failed != null && row.original.status.failed >= 1) {
            return <Status color="#cc3d42">Failed</Status>;
          }

          return <Status color="#ffffff11">Running</Status>;
        },
      },

      {
        Header: "Details",
        id: "expand",
        Cell: ({ row }: CellProps<JobRun>) => {
          return (
            <Link to={`/apps/${appName}/job-history?job_run_id=${row.original.metadata.uid}&service=${row.original.jobName}`}>
              <ExpandButton>
                <i className="material-icons">open_in_new</i>
              </ExpandButton>
            </Link>
          );
        },
        maxWidth: 40,
      },
    ],
    []
  );

  return (
    <>
      {selectedJobRun && (
        <JobRunDetails
          jobRun={selectedJobRun}
        />
      )}
      {!selectedJobRun && (
        <StyledExpandedApp>
          <Container row spaced>
          <Container row>
            <Icon src={history} />
            <Text size={21}>Run history for</Text>
            <SelectRow
              displayFlex={true}
              label=""
              value={selectedJobName}
              setActiveValue={(x: string) => { setSelectedJobName(x); }}
              options={jobOptions}
              width="200px"
            />
          </Container>
            {selectedJobName !== "all" && (
              <TriggerJobButton projectId={projectId} clusterId={clusterId} appName={appName} jobName={selectedJobName} deploymentTargetId={deploymentTargetId}/>
            )}
          </Container>
          <Spacer y={1} />
          <Table
            columns={columns}
            disableGlobalFilter
            data={jobRuns.sort((a, b) => {
              return Date.parse(a?.metadata?.creationTimestamp) >
                Date.parse(b?.metadata?.creationTimestamp)
                ? -1
                : 1;
            })}
            isLoading={isLoadingJobRuns}
            enablePagination
          />
        </StyledExpandedApp>
      )}
    </>
  );
};

export default JobsSection;

const Icon = styled.img`
  height: 24px;
  margin-right: 15px;
`;

const StyledExpandedApp = styled.div`
  width: 100%;
  height: 100%;

  animation: fadeIn 0.5s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
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

const ExpandButton = styled.div`
  user-select: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  > i {
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    margin: 5px 5px;
    :hover {
      background: #ffffff11;
    }
  }
`;
