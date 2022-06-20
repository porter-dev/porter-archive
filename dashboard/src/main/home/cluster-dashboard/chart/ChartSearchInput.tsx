import React, { useEffect } from "react";
import styled from "styled-components";

type ChartSearchInputProps = {
  onChange: (value: string) => void;
  value: string;
};

const ChartSearchInput = ({
  onChange,
  value,
}: ChartSearchInputProps): JSX.Element => {
  useEffect(() => {
    () => {
      onChange("");
    };
  }, []);
  return (
    <SearchRow>
      <i className="material-icons">search</i>
      <SearchInput
        value={value}
        onChange={(e: any) => {
          onChange(e.target.value);
        }}
        placeholder="Search by name"
      />
    </SearchRow>
  );
};

export default ChartSearchInput;

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

  i {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
    font-size: 20px;
  }
`;
