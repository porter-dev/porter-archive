import Placeholder from "components/Placeholder";
import React from "react";
import {
  Column,
  Row,
  useGlobalFilter,
  usePagination,
  useTable,
} from "react-table";
import {
  StyledTd,
  StyledTable,
  StyledTHead,
  StyledTh,
  StyledTBody,
} from "../main/home/cluster-dashboard/expanded-chart/events/styles";

export type TableProps = {
  columns: Column<any>[];
  data: any[];
  onRowClick?: (row: Row) => void;
  placeholder?: string;
};

const Table: React.FC<TableProps> = ({
  columns: columnsData,
  data,
  onRowClick,
  placeholder,
}) => {
  if (!data || data.length == 0) {
    return <Placeholder>{placeholder}</Placeholder>;
  }

  const {
    rows,
    getTableProps,
    getTableBodyProps,
    prepareRow,
    headerGroups,
  } = useTable(
    {
      columns: columnsData,
      data,
    },
    useGlobalFilter,
    usePagination
  );

  const renderRows = () => {
    return (
      <>
        {rows.map((row: any) => {
          prepareRow(row);

          return (
            <tr
              {...row.getRowProps()}
              onClick={() => onRowClick && onRowClick(row)}
              selected={false}
            >
              {row.cells.map((cell: any) => {
                return (
                  <StyledTd
                    {...cell.getCellProps()}
                    style={{
                      width: cell.column.totalWidth,
                    }}
                  >
                    {cell.render("Cell")}
                  </StyledTd>
                );
              })}
            </tr>
          );
        })}
      </>
    );
  };

  return (
    <>
      <StyledTable {...getTableProps()}>
        <StyledTHead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <StyledTh {...column.getHeaderProps()}>
                  {column.render("Header")}
                </StyledTh>
              ))}
            </tr>
          ))}
        </StyledTHead>
        <StyledTBody {...getTableBodyProps()}>{renderRows()}</StyledTBody>
      </StyledTable>
    </>
  );
};

export default Table;
