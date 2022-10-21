import React, { useContext, useEffect, useMemo, useState } from "react";

import Table from "components/OldTable";
import { Column } from "react-table";
import styled from "styled-components";
import api from "shared/api";
import { Context } from "shared/Context";
import { pushFiltered } from "shared/routing";
import { useHistory, useLocation } from "react-router";

const NodeList: React.FC = () => {
  const context = useContext(Context);
  const [nodeList, setNodeList] = useState([]);
  const [loading, setLoading] = useState<boolean>(false);
  const history = useHistory();
  const location = useLocation();

  const columns = useMemo<Column<any>[]>(
    () => [
      {
        Header: "Node Name",
        accessor: "name",
        Cell: ({ row }) => {
          return <NameWrapper>{row.values.name}</NameWrapper>;
        },
        width: "max-content",
      },
      {
        Header: "Machine Type",
        accessor: "machine_type",
      },
      {
        Header: "CPU Usage",
        accessor: "cpu_usage",
      },
      {
        Header: "RAM Usage",
        accessor: "ram_usage",
      },
      {
        Header: () => <StatusHeader>Node Condition</StatusHeader>,
        accessor: "is_node_healthy",
        Cell: ({ row }) => {
          return (
            <StatusButtonWrapper>
              <StatusButton success={row.values.is_node_healthy}>
                {row.values.is_node_healthy ? "Healthy" : "Unhealthy"}
              </StatusButton>
            </StatusButtonWrapper>
          );
        },
      },
    ],
    []
  );

  const data = useMemo(() => {
    const percentFormatter = (number: number) =>
      `${Number(number).toFixed(2)}%`;

    const getMachineType = (labels: any) => {
      return (labels && labels["node.kubernetes.io/instance-type"]) || "N/A";
    };

    return nodeList
      .map((node) => {
        return {
          name: node.name,
          machine_type: getMachineType(node?.labels),
          cpu_usage: percentFormatter(node.fraction_cpu_reqs),
          ram_usage: percentFormatter(node.fraction_memory_reqs),
          node_conditions: node.node_conditions,
          is_node_healthy: node.node_conditions.reduce(
            (prevValue: boolean, current: any) => {
              if (current.type !== "Ready" && current.status !== "False") {
                return false;
              }
              if (current.type === "Ready" && current.status !== "True") {
                return false;
              }
              return prevValue;
            },
            true
          ),
        };
      })
      .sort((firstEl, secondElement) =>
        firstEl.is_node_healthy === secondElement.is_node_healthy
          ? 0
          : firstEl.is_node_healthy
          ? 1
          : -1
      );
  }, [nodeList]);

  useEffect(() => {
    const { currentCluster, currentProject } = context;
    setLoading(true);
    api
      .getClusterNodes(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      )
      .then(({ data }) => {
        if (data) {
          setNodeList(data);
        }
      })
      .catch(() => {
        console.log({ error: true });
      })
      .finally(() => setLoading(false));
  }, [context, setNodeList]);

  const handleOnRowClick = (row: any) => {
    pushFiltered(
      {
        history,
        location,
      },
      `/cluster-dashboard/node-view/${row.original.name}`,
      []
    );
  };

  return (
    <NodeListWrapper>
      <StyledChart>
        <Table
          columns={columns}
          data={data}
          isLoading={loading}
          onRowClick={handleOnRowClick}
        />
      </StyledChart>
    </NodeListWrapper>
  );
};

export default NodeList;

const NodeListWrapper = styled.div`
  margin-top: 35px;
`;

const StyledChart = styled.div`
  padding: 14px;
  position: relative;
  width: 100%;
  height: 100%;
  :not(:last-child) {
    margin-bottom: 25px;
  }
  border-radius: 8px;
  background: #26292e;
  border: 1px solid #494b4f;
`;

const StatusHeader = styled.div`
  width: 100%;
  text-align: center;
`;

const StatusButtonWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
`;

const StatusButton = styled.div`
  cursor: pointer;
  display: flex;
  border-radius: 3px;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  height: 21px;
  font-size: 13px;
  width: 70px;
  background: ${(props: { success: boolean }) =>
    props.success ? "#616FEEcc" : "#ed5f85"};
  :hover {
    background: ${(props: { success: boolean }) =>
      props.success ? "#405eddbb" : "#e83162"};
  }
`;

const NameWrapper = styled.span`
  white-space: nowrap;
  margin-right: 10px;
`;
