import React, { useContext, useEffect, useMemo, useState } from "react";

import Table from "components/Table";
import { Column } from "react-table";
import styled from "styled-components";
import api from "shared/api";
import { Context } from "shared/Context";

const NodeList: React.FC = () => {
  const context = useContext(Context);
  const [nodeList, setNodeList] = useState([]);
  const [loading, setLoading] = useState<boolean>(false);

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
    ],
    []
  );

  const data = useMemo(() => {
    const percentFormatter = (number: number) => `${Number(number).toFixed(2)}%`
    
    return nodeList.map( node => {
      return {
        name: node.name,
        cpu_usage: percentFormatter(node.cpu_reqs),
        ram_usage: percentFormatter(node.memory_reqs)
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