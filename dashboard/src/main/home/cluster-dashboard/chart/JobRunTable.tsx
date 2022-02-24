import Loading from "components/Loading";
import Table from "components/Table";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { CellProps, Column } from "react-table";
import api from "shared/api";
import { Context } from "shared/Context";
import { NewWebsocketOptions, useWebsockets } from "shared/hooks/useWebsockets";
import styled from "styled-components";

type Props = {
  lastRunStatus: "failed" | "succeded" | "active" | "all";
  namespace: string;
  sortType: "Newest" | "Oldest" | "Alphabetical";
};

const dateFormatter = (date: string) => {
  if (!date) {
    return "N/A";
  }
  const newDate = new Date(date);
  return new Intl.DateTimeFormat([], {
    // @ts-ignore
    timeStyle: "long",
    dateStyle: "short",
  }).format(newDate);
};

const JobRunTable: React.FC<Props> = ({
  lastRunStatus,
  namespace,
  sortType,
}) => {
  const { currentCluster, currentProject } = useContext(Context);
  const [jobRuns, setJobRuns] = useState<JobRun[]>(null);
  const [error, setError] = useState();
  const tmpJobRuns = useRef([]);
  const { openWebsocket, newWebsocket, closeAllWebsockets } = useWebsockets();

  useEffect(() => {
    closeAllWebsockets();
    tmpJobRuns.current = [];
    setJobRuns(null);
    const websocketId = "job-runs-for-all-charts-ws";
    const endpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/namespaces/${namespace}/jobs/stream`;

    const config: NewWebsocketOptions = {
      onopen: console.log,
      onmessage: (message) => {
        const data = JSON.parse(message.data);
        if (data.streamStatus === "finished") {
          setJobRuns(tmpJobRuns.current);
          return;
        }

        if (data.streamStatus === "errored") {
          setError(data.error);
          tmpJobRuns.current = [];
          setJobRuns([]);
          return;
        }

        tmpJobRuns.current = [...tmpJobRuns.current, data];
      },
      onclose: () => {
        closeAllWebsockets();
      },
      onerror: (error) => {
        console.log(error);
        closeAllWebsockets();
      },
    };
    newWebsocket(websocketId, endpoint, config);
    openWebsocket(websocketId);

    return () => {
      closeAllWebsockets();
    };
  }, [currentCluster, currentProject, namespace]);

  const columns = useMemo<Column<JobRun>[]>(
    () => [
      {
        Header: "Owner name",
        accessor: (originalRow) => {
          const owners = originalRow.metadata.ownerReferences;

          if (Array.isArray(owners)) {
            return owners[0]?.name || "N/A";
          }
          return "N/A";
        },
      },
      {
        Header: "Started At",
        accessor: (originalRow) => dateFormatter(originalRow.status.startTime),
      },
      {
        Header: "Finished At",
        accessor: (originalRow) =>
          dateFormatter(originalRow.status?.completionTime) ||
          "Still running...",
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
        Cell: ({ row }: CellProps<JobRun>) => {
          const container = row.original.spec?.template?.spec?.containers[0];

          const tag = container?.image?.split(":")[1];
          return tag;
        },
      },
      {
        Header: "Command",
        id: "command",
        Cell: ({ row }: CellProps<JobRun>) => {
          const container = row.original.spec?.template?.spec?.containers[0];

          return (
            <CommandString>
              {container?.command?.join(" ") || "N/A"}
            </CommandString>
          );
        },
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
      case "succeded":
        tmp = filter.filterBySucceded();
        break;
      case "failed":
        tmp = filter.filterByFailed();
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

  if (error) {
    return <>{error}</>;
  }

  if (jobRuns === null) {
    return <Loading />;
  }

  if (!jobRuns?.length) {
    return <>No job runs found</>;
  }

  return <Table columns={columns} data={data} isLoading={jobRuns === null} />;
};

export default JobRunTable;

const Status = styled.div<{ color: string }>`
  padding: 5px 10px;
  margin-right: 12px;
  background: ${(props) => props.color};
  font-size: 13px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min-content;
  height: 25px;
`;

const CommandString = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
  color: #ffffff55;
  margin-right: 27px;
  font-family: monospace;
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
    return this.jobRuns.filter((jobRun) => jobRun?.status?.succeeded);
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
