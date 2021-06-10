import React, { useMemo } from "react";
import Modal from "../../modals/Modal";
import Table from "components/Table";
import { Column } from "react-table";
import styled from "styled-components";

type NodeStatusModalProps = {
  onClose: () => void;
  node: any;
  width?: string;
  height?: string;
};

export const NodeStatusModal: React.FunctionComponent<NodeStatusModalProps> = ({
  onClose,
  node,
  width = "800px",
  height = "min-content",
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
    ],
    []
  );

  const data = useMemo(() => {
    return node?.node_conditions || [];
  }, [node]);

  return (
    <div>
      <Modal onRequestClose={onClose} width={width} height={height}>
        Node {node?.name} conditions:
        <TableWrapper>
          <Table columns={columns} data={data} isLoading={false} disableGlobalFilter={true}/>
        </TableWrapper>
      </Modal>
    </div>
  );
};

const TableWrapper = styled.div`
  margin-top: 14px;
`
