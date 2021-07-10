import React from "react";
import styled from "styled-components";
import { Column, Row, useGlobalFilter, useTable } from "react-table";
import InputRow from "./values-form/InputRow";
import Loading from "components/Loading";

const GlobalFilter: React.FunctionComponent<any> = ({ setGlobalFilter }) => {
  const [value, setValue] = React.useState("");
  const onChange = (value: string) => {
    setValue(value);
    setGlobalFilter(value || undefined);
  };

  return (
    <SearchRow>
      <i className="material-icons">search</i>
      <SearchInput
        value={value}
        onChange={(e: any) => {
          onChange(e.target.value);
        }}
        placeholder="Search"
      />
    </SearchRow>
  );
};

export type TableProps = {
  columns: Column<any>[];
  data: any[];
  onRowClick?: (row: Row) => void;
  isLoading: boolean;
  disableGlobalFilter?: boolean;
  disableHover?: boolean;
};

const Table: React.FC<TableProps> = ({
  columns: columnsData,
  data,
  onRowClick,
  isLoading,
  disableGlobalFilter = false,
  disableHover,
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
    useGlobalFilter,
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
              disableHover={disableHover}
              {...row.getRowProps()}
              enablePointer={!!onRowClick}
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
      {!disableGlobalFilter && (
        <GlobalFilter setGlobalFilter={setGlobalFilter} />
      )}
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

type StyledTrProps = {
  enablePointer?: boolean;
  disableHover?: boolean;
  selected?: boolean;
};

export const StyledTr = styled.tr`
  line-height: 2.2em;
  background: ${(props: StyledTrProps) => (props.selected ? "#ffffff11" : "")};
  :hover {
    background: ${(props: StyledTrProps) =>
      props.disableHover ? "" : "#ffffff22"};
  }
  cursor: ${(props: StyledTrProps) =>
    props.enablePointer ? "pointer" : "unset"};
`;

export const StyledTd = styled.td`
  font-size: 13px;
  color: #ffffff;
  :first-child {
    padding-left: 10px;
  }
  :last-child {
    padding-right: 10px;
  }
  user-select: text;
`;

export const StyledTHead = styled.thead`
  width: 100%;
  border-top: 1px solid #aaaabb22;
  border-bottom: 1px solid #aaaabb22;
`;

export const StyledTh = styled.th`
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  color: #aaaabb;
  :first-child {
    padding-left: 10px;
  }
  :last-child {
    padding-right: 10px;
  }
`;

export const StyledTable = styled.table`
  width: 100%;
  min-width: 500px;
  border-collapse: collapse;
`;

const SearchInput = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: none;
  width: 100%;
  color: white;
  padding: 0;
  height: 20px;
`;

const SearchRow = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  color: #ffffff55;
  border-radius: 4px;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  min-width: 300px;
  max-width: min-content;
  background: #ffffff11;
  margin-bottom: 15px;
  margin-top: 0px;
  i {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
    font-size: 20px;
  }
`;
