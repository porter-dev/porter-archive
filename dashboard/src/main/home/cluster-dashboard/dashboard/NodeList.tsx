import React, { useContext, useEffect, useMemo, useState } from "react";

import Table from "components/Table";
import { Column } from "react-table";
import styled from "styled-components";
import api from "shared/api";
import { Context } from "shared/Context";
import { NodeStatusModal } from "./NodeStatusModal";


const NodeList: React.FC = () => {
  const context = useContext(Context);
  const [nodeList, setNodeList] = useState([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<any>(undefined)

  const triggerPopUp = (node?: any) => {
    if (node) {
      setSelectedNode(node);
      return;
    }

    setSelectedNode(undefined)
  }

  const columns = useMemo<Column<any>[]>(
    () => [
      {
        Header: "Node name",
        accessor: "name",
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
        Cell: ({row}) => {
          return (
          <StatusButtonWrapper>
            <StatusButton
                success={row.values.is_node_healthy}
                onClick={() => triggerPopUp(row.original)}
            >
              {row.values.is_node_healthy ? "Healthy" : "Unhealthy"}
            </StatusButton>
          </StatusButtonWrapper>
        )}
      }
    ],
    []
  );

  const data = useMemo(() => {
    const percentFormatter = (number: number) => `${Number(number).toFixed(2)}%`
    
    return nodeList.map( node => {
      return {
        name: node.name,
        cpu_usage: percentFormatter(node.cpu_reqs),
        ram_usage: percentFormatter(node.memory_reqs),
        node_conditions: node.node_conditions,
        is_node_healthy:node.node_conditions.reduce((prevValue: boolean, current: any) => {
          console.log(current)
          if (current.type !== "Ready" && current.status !== "False") {
            return false
          } 
          return prevValue
        }, true),
      }
    })
  }, [nodeList]);

  useEffect(() => {
    const { currentCluster, currentProject } = context;
    setLoading(true)
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

  return (
    <NodeListWrapper>
      <StyledChart>
        <Table columns={columns} data={data} isLoading={loading}/>
      </StyledChart>
      {selectedNode && (
        <NodeStatusModal node={selectedNode} onClose={() => triggerPopUp()}/>
      )}
    </NodeListWrapper>
  );
};

export default NodeList;

const NodeListWrapper = styled.div`
  margin-top: 35px;
`

const StyledChart = styled.div`
  background: #26282f;
  padding: 14px;
  border-radius: 5px;
  box-shadow: 0 5px 8px 0px #00000033;
  position: relative;
  border: 2px solid #9eb4ff00;
  width: 100%;
  height: 100%;
  :not(:last-child) {
    margin-bottom: 25px;
  }
`;

const StatusHeader = styled.div`
  width: 100%;
  text-align: center;
`

const StatusButtonWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
`


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