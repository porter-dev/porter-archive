import React from "react";
import styled from "styled-components";
import { Column, Row, useGlobalFilter, useTable } from "react-table";
import InputRow from "./values-form/InputRow";
import Loading from "components/Loading";

const GlobalFilter: React.FunctionComponent<any> = ({ setGlobalFilter }) => {
  const [value, setValue] = React.useState("");
  const onChange = (value: string) => {
    setGlobalFilter(value || undefined);
  };

  return (
    <SearchRow>
      <i className="material-icons">search</i>
      <SearchInput>
        <StyledInputRow
          placeholder="Search"
          type="input"
          value={value || ""}
          setValue={(value) => {
            setValue(value as string);
            onChange(value as string);
          }}
        />
      </SearchInput>
    </SearchRow>
  );
};

export type TableProps = {
  columns: Column<any>[];
  data: any[];
  onRowClick?: (row: Row) => void;
  isLoading: boolean;
};

const Table: React.FC<TableProps> = ({
  columns: columnsData,
  data,
  onRowClick,
  isLoading,
}) => {
  const {
    getTableProps,
    getTableBodyProps,
    rows,
    setGlobalFilter,
    prepareRow,
    headerGroups,
    visibleColumns,
  } = useTable(
    {
      columns: columnsData,
      data,
    },
    useGlobalFilter
  );

  const renderRows = () => {
    if (isLoading) {
      return (
        <StyledTr disableHover={true} selected={false}>
          <StyledTd colSpan={visibleColumns.length}>
            <Loading />
          </StyledTd>
        </StyledTr>
      );
    }

    if (!rows.length) {
      return (
        <StyledTr disableHover={true} selected={false}>
          <StyledTd colSpan={visibleColumns.length}>No data available</StyledTd>
        </StyledTr>
      );
    }
    return (
      <>
        {rows.map((row) => {
          prepareRow(row);

          return (
            <StyledTr
              {...row.getRowProps()}
              onClick={() => onRowClick && onRowClick(row)}
              selected={false}
            >
              {row.cells.map((cell) => (
                <StyledTd {...cell.getCellProps()}>
                  {cell.render("Cell")}
                </StyledTd>
              ))}
            </StyledTr>
          );
        })}
      </>
    );
  };

  return (
    <TableWrapper>
      <GlobalFilter setGlobalFilter={setGlobalFilter} />
      <StyledTable {...getTableProps()}>
        <StyledTHead>
          {headerGroups.map((headerGroup) => (
            <StyledTr
              {...headerGroup.getHeaderGroupProps()}
              disableHover={true}
            >
              {headerGroup.headers.map((column) => (
                <StyledTh {...column.getHeaderProps()}>
                  {column.render("Header")}
                </StyledTh>
              ))}
            </StyledTr>
          ))}
        </StyledTHead>
        <tbody {...getTableBodyProps()}>{renderRows()}</tbody>
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

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  margin: 14px 0;
`;

const StyledInputRow = styled(InputRow)``;

const SearchInput = styled.div`
  ${StyledInputRow} {
    margin: 0 0 0 10px;
  }
`;
