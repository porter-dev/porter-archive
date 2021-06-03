import React, { useContext, useEffect, useMemo, useState } from "react";

import Table from "components/Table";
import { Column } from "react-table";
import styled from "styled-components";
import api from "shared/api";
import { Context } from "shared/Context";

const NodeList: React.FC = () => {
  const context = useContext(Context);
  const [nodeList, setNodeList] = useState([]);

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
    let { currentCluster, currentProject } = context;
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
      });
  }, [context, setNodeList]);

  return (
    <>
      <Table columns={columns} data={data} />
    </>
  );
};

export default NodeList;
