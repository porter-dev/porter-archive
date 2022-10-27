import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";
import Table from "components/Table";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { CellProps, Column, Row } from "react-table";
import api from "shared/api";
import { Context } from "shared/Context";
import { NewWebsocketOptions, useWebsockets } from "shared/hooks/useWebsockets";
import { useRouting } from "shared/routing";
import { relativeDate, timeFrom } from "shared/string_utils";
import styled from "styled-components";

type Props = {
  lastRunStatus: "failed" | "succeeded" | "active" | "all";
  namespace: string;
  sortType: "Newest" | "Oldest" | "Alphabetical";
};

const runnedFor = (start: string | number, end?: string | number) => {
  const duration = timeFrom(start, end);

  const unit =
    duration.time === 1
      ? duration.unitOfTime.substring(0, duration.unitOfTime.length - 1)
      : duration.unitOfTime;

  return `${duration.time} ${unit}`;
};

const JobRunTable: React.FC<Props> = ({
  lastRunStatus,
  namespace,
  sortType,
}) => {
  const { currentCluster, currentProject } = useContext(Context);
  const [jobRuns, setJobRuns] = useState<JobRun[]>(null);
  const [hasError, setHasError] = useState(false);
  const tmpJobRuns = useRef([]);
  const lastStreamStatus = useRef("");
  const { openWebsocket, newWebsocket, closeAllWebsockets } = useWebsockets();

  const getJobRuns = () => {
    closeAllWebsockets();
    tmpJobRuns.current = [];
    lastStreamStatus.current = "";
    setJobRuns(null);
    setHasError(false);
    const websocketId = `job-runs-for-all-charts-ws`;
    const endpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/namespaces/${namespace}/jobs/stream`;

    const config: NewWebsocketOptions = {
      onopen: console.log,
      onmessage: (message) => {
        const data = JSON.parse(message.data);

        if (data.streamStatus === "finished") {
          setHasError(false);
          setJobRuns(tmpJobRuns.current);
          lastStreamStatus.current = data.streamStatus;
          return;
        }

        if (data.streamStatus === "errored") {
          setHasError(true);
          tmpJobRuns.current = [];
          setJobRuns([]);
          return;
        }

        tmpJobRuns.current = [...tmpJobRuns.current, data];
      },
      onclose: (event) => {
        // console.log(event);
        closeAllWebsockets();
      },
      onerror: (error) => {
        setHasError(true);
        console.log(error);
        closeAllWebsockets();
      },
    };
    newWebsocket(websocketId, endpoint, config);
    openWebsocket(websocketId);
  };

  useEffect(() => {
    if (!namespace) {
      return;
    }

    getJobRuns();
  }, [currentCluster, currentProject, namespace]);

  useEffect(() => {
    return () => {
      closeAllWebsockets();
    };
  }, []);

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
        accessor: (originalRow) => relativeDate(originalRow.status.startTime),
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
        Header: "Image tag",
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

          return (
            <RedirectButton
              to={{
                pathname: `/jobs/${currentCluster.name}/${row.original?.metadata?.namespace}/${row.original?.metadata?.labels["meta.helm.sh/release-name"]}`,
                search: urlParams.toString(),
              }}
            >
              <i className="material-icons">open_in_new</i>
            </RedirectButton>
          );
        },
        maxWidth: 40,
      },
    ],
    []
  );

  const data = useMemo(() => {
    if (jobRuns === null) {
      return [];
    }
    let tmp = [...tmpJobRuns.current];
    const filter = new JobRunsFilter(tmp);
    switch (lastRunStatus) {
      case "active":
        tmp = filter.filterByActive();
        break;
      case "failed":
        tmp = filter.filterByFailed();
        break;
      case "succeeded":
        tmp = filter.filterBySucceded();
        break;
      default:
        tmp = filter.dontFilter();
        break;
    }

    const sorter = new JobRunsSorter(tmp);
    switch (sortType) {
      case "Alphabetical":
        tmp = sorter.sortByAlphabetical();
        break;
      case "Newest":
        tmp = sorter.sortByNewest();
        break;
      case "Oldest":
        tmp = sorter.sortByOldest();
        break;
      default:
        break;
    }

    return tmp;
  }, [jobRuns, lastRunStatus, sortType]);

  if (hasError && lastStreamStatus.current !== "finished") {
    return (
      <ErrorWrapper>
        Couldn't retrieve jobs, please try again.{" "}
        <RetryButton onClick={() => getJobRuns()}>Retry</RetryButton>
      </ErrorWrapper>
    );
  }

  if (jobRuns === null) {
    return <Loading />;
  }

  if (!jobRuns?.length) {
    return <>No job runs found</>;
  }

  return (
    <Table
      columns={columns}
      data={data}
      isLoading={jobRuns === null}
      enablePagination
    />
  );
};

export default JobRunTable;

const RetryButton = styled.button`
  margin-left: 10px;
  border: none;
  background: #5460c6;
  color: white;
  padding: 5px 10px;
  border-radius: 25px;
  min-height: 35px;
  min-width: 65px;
  cursor: pointer;
`;

const ErrorWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  width: 100%;
  color: #ffffff88;
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

const CommandString = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
  color: #ffffff55;
  margin-right: 27px;
  font-family: monospace;
`;

const RedirectButton = styled(DynamicLink)`
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  > i {
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    margin: 0 5px;
    color: #ffffff44;
    :hover {
      background: #ffffff11;
    }
  }
`;

type JobRun = {
  metadata: {
    name: string;
    namespace: string;
    selfLink: string;
    uid: string;
    resourceVersion: string;
    creationTimestamp: string;
    labels: {
      [key: string]: string;
      "app.kubernetes.io/instance": string;
      "app.kubernetes.io/managed-by": string;
      "app.kubernetes.io/version": string;
      "helm.sh/chart": string;
      "helm.sh/revision": string;
      "meta.helm.sh/release-name": string;
    };
    ownerReferences: {
      apiVersion: string;
      kind: string;
      name: string;
      uid: string;
      controller: boolean;
      blockOwnerDeletion: boolean;
    }[];
    managedFields: unknown[];
  };
  spec: {
    [key: string]: unknown;
    parallelism: number;
    completions: number;
    backOffLimit?: number;
    selector: {
      [key: string]: unknown;
      matchLabels: {
        [key: string]: unknown;
        "controller-uid": string;
      };
    };
    template: {
      [key: string]: unknown;
      metadata: {
        creationTimestamp: string | null;
        labels: {
          [key: string]: unknown;
          "controller-uid": string;
          "job-name": string;
        };
      };
      spec: {
        containers: {
          name: string;
          image: string;
          command: string[];
          env?: {
            [key: string]: unknown;
            name: string;
            value?: string;
            valueFrom?: {
              secretKeyRef?: { name: string; key: string };
              configMapKeyRef?: { name: string; key: string };
            };
          }[];
          resources: {
            [key: string]: unknown;
            limits: { [key: string]: unknown; memory: string };
            requests: { [key: string]: unknown; cpu: string; memory: string };
          };
          terminationMessagePath: string;
          terminationMessagePolicy: string;
          imagePullPolicy: string;
        }[];

        restartPolicy: string;
        terminationGracePeriodSeconds: number;
        dnsPolicy: string;
        shareProcessNamespace: boolean;
        securityContext: unknown;
        schedulerName: string;
        tolerations: {
          [key: string]: unknown;
          key: string;
          operator: string;
          value: string;
          effect: string;
        }[];
      };
    };
  };
  status: {
    [key: string]: unknown;
    conditions: {
      [key: string]: unknown;
      type: string;
      status: string;
      lastProbeTime: string;
      lastTransitionTime: string;
    }[];
    startTime: string;
    completionTime: string | undefined | null;
    succeeded?: number;
    failed?: number;
    active?: number;
  };
};

class JobRunsFilter {
  jobRuns: JobRun[];

  constructor(newJobRuns: JobRun[]) {
    this.jobRuns = newJobRuns;
  }

  filterByFailed() {
    return this.jobRuns.filter((jobRun) => jobRun?.status?.failed);
  }

  filterByActive() {
    return this.jobRuns.filter((jobRun) => jobRun?.status?.active);
  }

  filterBySucceded() {
    return this.jobRuns.filter(
      (jobRun) =>
        jobRun?.status?.succeeded &&
        !jobRun?.status?.active &&
        !jobRun?.status?.failed
    );
  }

  dontFilter() {
    return this.jobRuns;
  }
}

class JobRunsSorter {
  jobRuns: JobRun[];

  constructor(newJobRuns: JobRun[]) {
    this.jobRuns = newJobRuns;
  }

  sortByNewest() {
    return this.jobRuns.sort((a, b) => {
      return Date.parse(a?.metadata?.creationTimestamp) >
        Date.parse(b?.metadata?.creationTimestamp)
        ? -1
        : 1;
    });
  }

  sortByOldest() {
    return this.jobRuns.sort((a, b) => {
      return Date.parse(a?.metadata?.creationTimestamp) >
        Date.parse(b?.metadata?.creationTimestamp)
        ? 1
        : -1;
    });
  }

  sortByAlphabetical() {
    return this.jobRuns.sort((a, b) =>
      a?.metadata?.name > b?.metadata?.name ? 1 : -1
    );
  }
}
