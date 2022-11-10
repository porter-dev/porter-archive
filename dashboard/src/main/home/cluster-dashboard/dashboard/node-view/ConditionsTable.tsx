import React, { useMemo } from "react";
import Table from "components/OldTable";
import { Column } from "react-table";
import styled from "styled-components";

type NodeStatusModalProps = {
  node: any;
};

export const ConditionsTable: React.FunctionComponent<NodeStatusModalProps> = ({
  node,
}) => {
  const columns = useMemo<Column<any>[]>(
    () => [
      {
        Header: "Type",
        accessor: "type",
      },
      {
        Header: "Status",
        accessor: "status",
      },
      {
        Header: "Reason",
        accessor: "reason",
      },
      {
        Header: "Message",
        accessor: "message",
      },
      {
        Header: "Last Transition",
        accessor: "lastTransitionTime",
        Cell: ({ row }) => {
          const date = new Date(row.values.lastTransitionTime);
          return <>{date.toLocaleString()}</>;
        },
      },
    ],
    []
  );

  const data = useMemo<Array<any>>(() => {
    return node?.node_conditions || [];
  }, [node]);

  return (
    <div>
      <TableWrapper>
        <Table
          columns={columns}
          data={data}
          isLoading={!data.length}
          disableGlobalFilter={true}
        />
      </TableWrapper>
    </div>
  );
};

const TableWrapper = styled.div`
  margin-top: 36px;
`;
