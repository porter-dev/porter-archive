import React, { useEffect, useState, useContext, useCallback, useMemo } from "react";
import styled from "styled-components";

import history from "assets/history.png";

import { Context } from "shared/Context";

import Loading from "components/Loading";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import { JobRun, useJobs } from "lib/hooks/useJobs";
import Table from "components/OldTable";
import { CellProps, Column } from "react-table";
import { relativeDate, timeFrom } from "shared/string_utils";
import { useRevisionIdToNumber } from "lib/hooks/useRevisionList";

type Props = {
  appName: string;
  jobName: string;
  projectId: number;
  clusterId: number;
  deploymentTargetId: string;
};

const JobsSection: React.FC<Props> = ({
  appName,
  jobName,
  projectId,
  clusterId,
  deploymentTargetId,
}) => {
  const { currentCluster, currentProject } = useContext(
    Context
  );
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRun, setExpandedRun] = useState(null);

  const { jobRuns } = useJobs({
    projectId,
    clusterId,
    deploymentTargetId,
  });

  const revisionIdToNumber = useRevisionIdToNumber(appName, deploymentTargetId);
  console.log(revisionIdToNumber);

  const runnedFor = (start: string | number, end?: string | number) => {
    const duration = timeFrom(start, end);

    const unit =
      duration.time === 1
        ? duration.unitOfTime.substring(0, duration.unitOfTime.length - 1)
        : duration.unitOfTime;

    return `${duration.time} ${unit}`;
  };

  const columns = useMemo<Column<JobRun>[]>(
    () => [
      {
        Header: "Started",
        accessor: (originalRow) => relativeDate(originalRow?.status.startTime ?? ''),
      },
      {
        Header: "Run for",
        accessor: (originalRow) => {
          if (originalRow?.status?.completionTime) {
            return originalRow?.status?.completionTime;
          } else if (
            Array.isArray(originalRow?.status?.conditions) &&
            originalRow?.status?.conditions[0]?.lastTransitionTime
          ) {
            return originalRow?.status?.conditions[0]?.lastTransitionTime;
          } else {
            return "Still running...";
          }
        },
        Cell: ({ row }) => {
          if (row.original?.status?.completionTime) {
            return runnedFor(
              row.original?.status?.startTime,
              row.original?.status?.completionTime
            );
          } else if (
            Array.isArray(row.original?.status?.conditions) &&
            row.original?.status?.conditions[0]?.lastTransitionTime
          ) {
            return runnedFor(
              row.original?.status?.startTime,
              row.original?.status?.conditions[0]?.lastTransitionTime
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
          if (row.original?.status?.succeeded >= 1) {
            return <Status color="#38a88a">Succeeded</Status>;
          }

          if (row.original?.status?.failed >= 1) {
            return <Status color="#cc3d42">Failed</Status>;
          }

          return <Status color="#ffffff11">Running</Status>;
        },
      },
      {
        Header: "Version",
        id: "version_number",
        accessor: (originalRow) => {
          return revisionIdToNumber[originalRow.metadata.labels["porter.run/app-revision-id"]];
        },
        Cell: ({ row }: CellProps<JobRun>) => {
          return <div>{revisionIdToNumber[row.original.metadata.labels["porter.run/app-revision-id"]]}</div>;
        },
      },
      {
        id: "expand",
        Cell: ({ row }: CellProps<JobRun>) => {
          /**
           * project_id: currentProject.id,
          chart_revision: 0,
          job: row.original?.metadata?.name,
           */
          const urlParams = new URLSearchParams();
          urlParams.append("project_id", String(currentProject.id));
          urlParams.append("chart_revision", String(0));
          urlParams.append("job", row.original.metadata.name);
          if (!setExpandedRun) {
            return (
              <div>hello</div>
            );
          } else {
            return (
              <div>hello</div>
            )
          }
        },
        maxWidth: 40,
      },
    ],
    []
  );

  return (
    <>
      {isLoading && <Loading />}
      {/* {!isLoading && expandedRun && (
        // <ExpandedJobRun
        //   currentChart={null}
        //   jobRun={expandedRun}
        //   onClose={() => setExpandedRun(null)}
        // />
      )} */}
      {!isLoading && !expandedRun && (
        <StyledExpandedApp>
          <Container row>
            <Icon src={history} />
            <Text size={21}>Run history for "{jobName}"</Text>
          </Container>
          <Spacer y={0.5} />
          <Text color="#aaaabb66">
            This job runs under the "{appName}" app.
          </Text>
          <Spacer y={1} />
          <Table
            columns={columns}
            disableGlobalFilter
            data={jobRuns}
            isLoading={jobRuns === null}
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
