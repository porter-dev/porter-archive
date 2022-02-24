import Loading from "components/Loading";
import Table from "components/Table";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { CellProps, Column } from "react-table";
import api from "shared/api";
import { Context } from "shared/Context";
import { NewWebsocketOptions, useWebsockets } from "shared/hooks/useWebsockets";
import styled from "styled-components";

type Props = {
  lastRunStatus: "failed" | "completed" | "active" | "all";
  namespace: string;
  sortType: "newest" | "oldest" | "alphabetical";
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
  }, [currentCluster, currentProject, namespace, sortType, lastRunStatus]);

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
    return [...jobRuns];
  }, [jobRuns]);

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

const getMockData = () =>
  new Promise<{ data: JobRun[] }>((resolve) => {
    setTimeout(() => {
      resolve({ data: mockData });
    });
  });

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
    succeeded: number;
  };
};

const mockData = [
  {
    metadata: {
      name: "pond-plain-compound-job-1645219800",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645219800",
      uid: "521ddff6-d974-4120-9b58-bf1884f60795",
      resourceVersion: "12327105",
      creationTimestamp: "2022-02-18T21:30:02Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T21:30:16Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "521ddff6-d974-4120-9b58-bf1884f60795",
        },
      },
      template: {
        metadata: {
          creationTimestamp: "",
          labels: {
            "controller-uid": "521ddff6-d974-4120-9b58-bf1884f60795",
            "job-name": "pond-plain-compound-job-1645219800",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T21:30:16Z",
          lastTransitionTime: "2022-02-18T21:30:16Z",
        },
      ],
      startTime: "2022-02-18T21:30:02Z",
      completionTime: "2022-02-18T21:30:16Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645220100",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645220100",
      uid: "5642bc58-0be9-4e80-bb14-ecc3c9460764",
      resourceVersion: "12328564",
      creationTimestamp: "2022-02-18T21:35:04Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T21:35:18Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "5642bc58-0be9-4e80-bb14-ecc3c9460764",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "5642bc58-0be9-4e80-bb14-ecc3c9460764",
            "job-name": "pond-plain-compound-job-1645220100",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T21:35:18Z",
          lastTransitionTime: "2022-02-18T21:35:18Z",
        },
      ],
      startTime: "2022-02-18T21:35:04Z",
      completionTime: "2022-02-18T21:35:18Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645220400",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645220400",
      uid: "fba1be55-899a-4da1-872d-b1a38472801e",
      resourceVersion: "12330026",
      creationTimestamp: "2022-02-18T21:40:06Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T21:40:21Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "fba1be55-899a-4da1-872d-b1a38472801e",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "fba1be55-899a-4da1-872d-b1a38472801e",
            "job-name": "pond-plain-compound-job-1645220400",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T21:40:21Z",
          lastTransitionTime: "2022-02-18T21:40:21Z",
        },
      ],
      startTime: "2022-02-18T21:40:06Z",
      completionTime: "2022-02-18T21:40:21Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645220700",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645220700",
      uid: "f0f9fefa-bddc-4510-a37d-44e478b6c78a",
      resourceVersion: "12331488",
      creationTimestamp: "2022-02-18T21:45:09Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T21:45:23Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "f0f9fefa-bddc-4510-a37d-44e478b6c78a",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "f0f9fefa-bddc-4510-a37d-44e478b6c78a",
            "job-name": "pond-plain-compound-job-1645220700",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T21:45:23Z",
          lastTransitionTime: "2022-02-18T21:45:23Z",
        },
      ],
      startTime: "2022-02-18T21:45:09Z",
      completionTime: "2022-02-18T21:45:23Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645221000",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645221000",
      uid: "8a858e5e-0bc5-4754-9c97-66c906e22fc1",
      resourceVersion: "12332910",
      creationTimestamp: "2022-02-18T21:50:01Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T21:50:15Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "8a858e5e-0bc5-4754-9c97-66c906e22fc1",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "8a858e5e-0bc5-4754-9c97-66c906e22fc1",
            "job-name": "pond-plain-compound-job-1645221000",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T21:50:15Z",
          lastTransitionTime: "2022-02-18T21:50:15Z",
        },
      ],
      startTime: "2022-02-18T21:50:01Z",
      completionTime: "2022-02-18T21:50:15Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645221300",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645221300",
      uid: "b916d9a9-f392-4db4-a494-b97d5b3b05f7",
      resourceVersion: "12334382",
      creationTimestamp: "2022-02-18T21:55:03Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T21:55:18Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "b916d9a9-f392-4db4-a494-b97d5b3b05f7",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "b916d9a9-f392-4db4-a494-b97d5b3b05f7",
            "job-name": "pond-plain-compound-job-1645221300",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T21:55:18Z",
          lastTransitionTime: "2022-02-18T21:55:18Z",
        },
      ],
      startTime: "2022-02-18T21:55:03Z",
      completionTime: "2022-02-18T21:55:18Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645221600",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645221600",
      uid: "878a0ba9-e565-48e9-a30f-b33afaeba8a5",
      resourceVersion: "12335868",
      creationTimestamp: "2022-02-18T22:00:06Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T22:00:20Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "878a0ba9-e565-48e9-a30f-b33afaeba8a5",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "878a0ba9-e565-48e9-a30f-b33afaeba8a5",
            "job-name": "pond-plain-compound-job-1645221600",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T22:00:20Z",
          lastTransitionTime: "2022-02-18T22:00:20Z",
        },
      ],
      startTime: "2022-02-18T22:00:06Z",
      completionTime: "2022-02-18T22:00:20Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645221900",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645221900",
      uid: "dcba70c3-2de9-4704-ae08-8bcf9210db0c",
      resourceVersion: "12337327",
      creationTimestamp: "2022-02-18T22:05:08Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T22:05:22Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "dcba70c3-2de9-4704-ae08-8bcf9210db0c",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "dcba70c3-2de9-4704-ae08-8bcf9210db0c",
            "job-name": "pond-plain-compound-job-1645221900",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T22:05:22Z",
          lastTransitionTime: "2022-02-18T22:05:22Z",
        },
      ],
      startTime: "2022-02-18T22:05:08Z",
      completionTime: "2022-02-18T22:05:22Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645222200",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645222200",
      uid: "cadb1411-29bc-4008-9baf-25bc0c3dd7f2",
      resourceVersion: "12338739",
      creationTimestamp: "2022-02-18T22:10:00Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T22:10:14Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "cadb1411-29bc-4008-9baf-25bc0c3dd7f2",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "cadb1411-29bc-4008-9baf-25bc0c3dd7f2",
            "job-name": "pond-plain-compound-job-1645222200",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T22:10:14Z",
          lastTransitionTime: "2022-02-18T22:10:14Z",
        },
      ],
      startTime: "2022-02-18T22:10:00Z",
      completionTime: "2022-02-18T22:10:14Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645222500",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645222500",
      uid: "d3f0f88a-f5e6-48e9-a3bc-195b1bc1cdf9",
      resourceVersion: "12340201",
      creationTimestamp: "2022-02-18T22:15:03Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T22:15:17Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "d3f0f88a-f5e6-48e9-a3bc-195b1bc1cdf9",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "d3f0f88a-f5e6-48e9-a3bc-195b1bc1cdf9",
            "job-name": "pond-plain-compound-job-1645222500",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T22:15:17Z",
          lastTransitionTime: "2022-02-18T22:15:17Z",
        },
      ],
      startTime: "2022-02-18T22:15:03Z",
      completionTime: "2022-02-18T22:15:17Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645222800",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645222800",
      uid: "2f6635db-47ed-4890-b8a8-e866502a81b8",
      resourceVersion: "12341659",
      creationTimestamp: "2022-02-18T22:20:05Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T22:20:19Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "2f6635db-47ed-4890-b8a8-e866502a81b8",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "2f6635db-47ed-4890-b8a8-e866502a81b8",
            "job-name": "pond-plain-compound-job-1645222800",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T22:20:19Z",
          lastTransitionTime: "2022-02-18T22:20:19Z",
        },
      ],
      startTime: "2022-02-18T22:20:05Z",
      completionTime: "2022-02-18T22:20:19Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645223100",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645223100",
      uid: "70d33a46-5369-4ae5-b4c9-7f43d8146f33",
      resourceVersion: "12343109",
      creationTimestamp: "2022-02-18T22:25:07Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T22:25:21Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "70d33a46-5369-4ae5-b4c9-7f43d8146f33",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "70d33a46-5369-4ae5-b4c9-7f43d8146f33",
            "job-name": "pond-plain-compound-job-1645223100",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T22:25:21Z",
          lastTransitionTime: "2022-02-18T22:25:21Z",
        },
      ],
      startTime: "2022-02-18T22:25:07Z",
      completionTime: "2022-02-18T22:25:21Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645223400",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645223400",
      uid: "14e128c6-010f-4bff-b89c-1d72e657187d",
      resourceVersion: "12344581",
      creationTimestamp: "2022-02-18T22:30:10Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T22:30:24Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "14e128c6-010f-4bff-b89c-1d72e657187d",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "14e128c6-010f-4bff-b89c-1d72e657187d",
            "job-name": "pond-plain-compound-job-1645223400",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T22:30:24Z",
          lastTransitionTime: "2022-02-18T22:30:24Z",
        },
      ],
      startTime: "2022-02-18T22:30:10Z",
      completionTime: "2022-02-18T22:30:24Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645223700",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645223700",
      uid: "d4a567b8-d926-44eb-918a-c10ffc8ac64e",
      resourceVersion: "12346001",
      creationTimestamp: "2022-02-18T22:35:02Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T22:35:16Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "d4a567b8-d926-44eb-918a-c10ffc8ac64e",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "d4a567b8-d926-44eb-918a-c10ffc8ac64e",
            "job-name": "pond-plain-compound-job-1645223700",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T22:35:16Z",
          lastTransitionTime: "2022-02-18T22:35:16Z",
        },
      ],
      startTime: "2022-02-18T22:35:02Z",
      completionTime: "2022-02-18T22:35:16Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645224000",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645224000",
      uid: "47749d26-2a96-48ea-ad1e-3d327413c252",
      resourceVersion: "12347478",
      creationTimestamp: "2022-02-18T22:40:04Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T22:40:19Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "47749d26-2a96-48ea-ad1e-3d327413c252",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "47749d26-2a96-48ea-ad1e-3d327413c252",
            "job-name": "pond-plain-compound-job-1645224000",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T22:40:19Z",
          lastTransitionTime: "2022-02-18T22:40:19Z",
        },
      ],
      startTime: "2022-02-18T22:40:04Z",
      completionTime: "2022-02-18T22:40:19Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645224300",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645224300",
      uid: "795fc084-600e-4bcb-b3e4-2bbb9d3333df",
      resourceVersion: "12348930",
      creationTimestamp: "2022-02-18T22:45:07Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T22:45:21Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "795fc084-600e-4bcb-b3e4-2bbb9d3333df",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "795fc084-600e-4bcb-b3e4-2bbb9d3333df",
            "job-name": "pond-plain-compound-job-1645224300",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T22:45:21Z",
          lastTransitionTime: "2022-02-18T22:45:21Z",
        },
      ],
      startTime: "2022-02-18T22:45:07Z",
      completionTime: "2022-02-18T22:45:21Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645224600",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645224600",
      uid: "b33895a4-9e42-4cf0-a747-14c224711746",
      resourceVersion: "12350391",
      creationTimestamp: "2022-02-18T22:50:09Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T22:50:23Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "b33895a4-9e42-4cf0-a747-14c224711746",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "b33895a4-9e42-4cf0-a747-14c224711746",
            "job-name": "pond-plain-compound-job-1645224600",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T22:50:23Z",
          lastTransitionTime: "2022-02-18T22:50:23Z",
        },
      ],
      startTime: "2022-02-18T22:50:09Z",
      completionTime: "2022-02-18T22:50:23Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645224900",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645224900",
      uid: "4e689f51-cced-42ee-9d94-6f58a44d3942",
      resourceVersion: "12351806",
      creationTimestamp: "2022-02-18T22:55:01Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T22:55:16Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "4e689f51-cced-42ee-9d94-6f58a44d3942",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "4e689f51-cced-42ee-9d94-6f58a44d3942",
            "job-name": "pond-plain-compound-job-1645224900",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T22:55:16Z",
          lastTransitionTime: "2022-02-18T22:55:16Z",
        },
      ],
      startTime: "2022-02-18T22:55:01Z",
      completionTime: "2022-02-18T22:55:16Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645225200",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645225200",
      uid: "6cf2876e-7a74-42a2-a330-0af2d13d3b89",
      resourceVersion: "12353264",
      creationTimestamp: "2022-02-18T23:00:04Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T23:00:18Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "6cf2876e-7a74-42a2-a330-0af2d13d3b89",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "6cf2876e-7a74-42a2-a330-0af2d13d3b89",
            "job-name": "pond-plain-compound-job-1645225200",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T23:00:18Z",
          lastTransitionTime: "2022-02-18T23:00:18Z",
        },
      ],
      startTime: "2022-02-18T23:00:04Z",
      completionTime: "2022-02-18T23:00:18Z",
      succeeded: 1,
    },
  },
  {
    metadata: {
      name: "pond-plain-compound-job-1645225500",
      namespace: "default",
      selfLink:
        "/apis/batch/v1/namespaces/default/jobs/pond-plain-compound-job-1645225500",
      uid: "f04e5985-d94f-426f-bb2e-5679941c7f5b",
      resourceVersion: "12354737",
      creationTimestamp: "2022-02-18T23:05:06Z",
      labels: {
        "app.kubernetes.io/instance": "pond-plain-compound",
        "app.kubernetes.io/managed-by": "Helm",
        "app.kubernetes.io/version": "1.16.0",
        "helm.sh/chart": "job-0.41.0",
        "helm.sh/revision": "7",
        "meta.helm.sh/release-name": "pond-plain-compound",
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1beta1",
          kind: "CronJob",
          name: "pond-plain-compound-job",
          uid: "4e116eb5-527b-4546-a210-8648c37bbc2c",
          controller: true,
          blockOwnerDeletion: true,
        },
      ],
      managedFields: [
        {
          manager: "kube-controller-manager",
          operation: "Update",
          apiVersion: "batch/v1",
          time: "2022-02-18T23:05:21Z",
          fieldsType: "FieldsV1",
          fieldsV1: {
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:app.kubernetes.io/instance": {},
                "f:app.kubernetes.io/managed-by": {},
                "f:app.kubernetes.io/version": {},
                "f:helm.sh/chart": {},
                "f:helm.sh/revision": {},
                "f:meta.helm.sh/release-name": {},
              },
              "f:ownerReferences": {
                ".": {},
                'k:{"uid":"4e116eb5-527b-4546-a210-8648c37bbc2c"}': {
                  ".": {},
                  "f:apiVersion": {},
                  "f:blockOwnerDeletion": {},
                  "f:controller": {},
                  "f:kind": {},
                  "f:name": {},
                  "f:uid": {},
                },
              },
            },
            "f:spec": {
              "f:backoffLimit": {},
              "f:completions": {},
              "f:parallelism": {},
              "f:template": {
                "f:spec": {
                  "f:containers": {
                    'k:{"name":"job"}': {
                      ".": {},
                      "f:command": {},
                      "f:env": {
                        ".": {},
                        'k:{"name":"FGSD"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asd"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"asdf"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"dsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"fdsa"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:secretKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gfd"}': {
                          ".": {},
                          "f:name": {},
                          "f:value": {},
                        },
                        'k:{"name":"gfg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"gggg"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"my-test"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                        'k:{"name":"testing"}': {
                          ".": {},
                          "f:name": {},
                          "f:valueFrom": {
                            ".": {},
                            "f:configMapKeyRef": {
                              ".": {},
                              "f:key": {},
                              "f:name": {},
                            },
                          },
                        },
                      },
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                    'k:{"name":"sidecar"}': {
                      ".": {},
                      "f:command": {},
                      "f:image": {},
                      "f:imagePullPolicy": {},
                      "f:name": {},
                      "f:resources": {
                        ".": {},
                        "f:limits": { ".": {}, "f:memory": {} },
                        "f:requests": { ".": {}, "f:cpu": {}, "f:memory": {} },
                      },
                      "f:terminationMessagePath": {},
                      "f:terminationMessagePolicy": {},
                    },
                  },
                  "f:dnsPolicy": {},
                  "f:restartPolicy": {},
                  "f:schedulerName": {},
                  "f:securityContext": {},
                  "f:shareProcessNamespace": {},
                  "f:terminationGracePeriodSeconds": {},
                  "f:tolerations": {},
                },
              },
            },
            "f:status": {
              "f:completionTime": {},
              "f:conditions": {
                ".": {},
                'k:{"type":"Complete"}': {
                  ".": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {},
                  "f:status": {},
                  "f:type": {},
                },
              },
              "f:startTime": {},
              "f:succeeded": {},
            },
          },
        },
      ],
    },
    spec: {
      parallelism: 1,
      completions: 1,
      backoffLimit: 0,
      selector: {
        matchLabels: {
          "controller-uid": "f04e5985-d94f-426f-bb2e-5679941c7f5b",
        },
      },
      template: {
        metadata: {
          creationTimestamp: null,
          labels: {
            "controller-uid": "f04e5985-d94f-426f-bb2e-5679941c7f5b",
            "job-name": "pond-plain-compound-job-1645225500",
          },
        },
        spec: {
          containers: [
            {
              name: "job",
              image: "ubuntu:latest",
              command: ["echo", "hello"],
              env: [
                {
                  name: "fdsa",
                  valueFrom: {
                    secretKeyRef: { name: "fourth-env-group.v7", key: "fdsa" },
                  },
                },
                {
                  name: "gfg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gfg",
                    },
                  },
                },
                {
                  name: "gggg",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "gggg",
                    },
                  },
                },
                {
                  name: "testing",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "testing",
                    },
                  },
                },
                {
                  name: "my-test",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "third-env-group.v1",
                      key: "my-test",
                    },
                  },
                },
                { name: "gfd", value: "asdf" },
                {
                  name: "FGSD",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "FGSD",
                    },
                  },
                },
                {
                  name: "dsa",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "dsa",
                    },
                  },
                },
                { name: "asdf", value: "fdsa" },
                {
                  name: "asd",
                  valueFrom: {
                    configMapKeyRef: {
                      name: "fourth-env-group.v7",
                      key: "asd",
                    },
                  },
                },
              ],
              resources: {
                limits: { memory: "256Mi" },
                requests: { cpu: "100m", memory: "256Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "IfNotPresent",
            },
            {
              name: "sidecar",
              image: "public.ecr.aws/o1j4x7p4/job-sidecar:latest",
              command: ["./job_killer.sh", "-c", "30", "echo"],
              resources: {
                limits: { memory: "10Mi" },
                requests: { cpu: "10m", memory: "10Mi" },
              },
              terminationMessagePath: "/dev/termination-log",
              terminationMessagePolicy: "File",
              imagePullPolicy: "Always",
            },
          ],
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 30,
          dnsPolicy: "ClusterFirst",
          shareProcessNamespace: true,
          securityContext: {},
          schedulerName: "default-scheduler",
          tolerations: [
            {
              key: "removable",
              operator: "Equal",
              value: "true",
              effect: "NoSchedule",
            },
          ],
        },
      },
    },
    status: {
      conditions: [
        {
          type: "Complete",
          status: "True",
          lastProbeTime: "2022-02-18T23:05:21Z",
          lastTransitionTime: "2022-02-18T23:05:21Z",
        },
      ],
      startTime: "2022-02-18T23:05:06Z",
      completionTime: "2022-02-18T23:05:21Z",
      succeeded: 1,
    },
  },
];
