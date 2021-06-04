import React from "react";
import styled from "styled-components";
import { Column, Row, useTable } from "react-table";

export type TableProps = {
  columns: Column<any>[];
  data: any[];
  onRowClick?: (row: Row) => void;
};

const Table: React.FC<TableProps> = ({
  columns: columnsData,
  data,
  onRowClick,
}) => {
  const {
    getTableProps,
    getTableBodyProps,
    headers,
    columns,
    rows,
    prepareRow,
    headerGroups,
  } = useTable({
    columns: columnsData,
    data,
  });

  return (
    <TableWrapper>
      <StyledTable {...getTableProps()}>
        <StyledTHead>
          {headerGroups.map((headerGroup) => (
            <StyledTr {...headerGroup.getHeaderGroupProps()} disableHover={true}>
              {headerGroup.headers.map((column) => (
                <StyledTh {...column.getHeaderProps()}>
                  {column.render("Header")}
                </StyledTh>
              ))}
            </StyledTr>
          ))}
        </StyledTHead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);

            return (
              <StyledTr
                {...row.getRowProps()}
                onClick={() => onRowClick && onRowClick(row)}
                selected={false}
              >
                {row.cells.map( cell => (
                  <StyledTd {...cell.getCellProps()}>{cell.render("Cell")}</StyledTd>
                ))}
              </StyledTr>
            );
          })}
        </tbody>
      </StyledTable>
    </TableWrapper>
  );
};

export default Table;

const TableWrapper = styled.div`
  padding-bottom: 20px;
`;

export const StyledTr = styled.tr`
  line-height: 2.2em;
  cursor: ${(props: { disableHover?: boolean; selected?: boolean }) =>
    props.disableHover ? "" : "pointer"};
  background: ${(props: { disableHover?: boolean; selected?: boolean }) =>
    props.selected ? "#ffffff11" : ""};
  :hover {
    background: ${(props: { disableHover?: boolean; selected?: boolean }) =>
      props.disableHover ? "" : "#ffffff22"};
  }
`;

export const StyledTd = styled.td`
  font-size: 13px;
  color: #ffffff;
`;

export const StyledTHead = styled.thead`
  width: 100%;
`;

export const StyledTh = styled.th`
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  color: #aaaabb;
`;

export const StyledTable = styled.table`
  width: 100%;
  min-width: 500px;
  border-collapse: collapse;
`;
