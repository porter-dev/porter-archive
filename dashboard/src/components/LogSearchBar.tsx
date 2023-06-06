import React, { useState } from "react";
import Button from "./Button";
import styled from "styled-components";
import dayjs from "dayjs";

interface Props {
  searchText: string;
  setSearchText: (x: string) => void;
  setEnteredSearchText: (x: string) => void;
  setSelectedDate: () => void;
}

const escapeRegExp = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const LogSearchBar: React.FC<Props> = ({
  searchText,
  setSearchText,
  setEnteredSearchText,
  setSelectedDate,
}) => {
  return (
    <SearchRowWrapper>
      <SearchBarWrapper>
        <i className="material-icons">search</i>
        <SearchInput
          value={searchText}
          onChange={(e: any) => {
            setSearchText(e.target.value);
          }}
          onKeyPress={(event) => {
            if (event.key === "Enter") {
              setEnteredSearchText(escapeRegExp(searchText));
              setSelectedDate();
            }
          }}
          placeholder="Search logs..."
        />
      </SearchBarWrapper>
    </SearchRowWrapper>
  );
};

export default LogSearchBar;

const SearchBarWrapper = styled.div`
  display: flex;
  flex: 1;

  > i {
    color: #aaaabb;
    padding-top: 1px;
    margin-left: 8px;
    font-size: 16px;
    margin-right: 8px;
  }
`;

const SearchInput = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: none;
  width: 100%;
  color: white;
  height: 100%;
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  height: 30px;
  margin-right: 10px;
  background: #26292e;
  border-radius: 5px;
  border: 1px solid #aaaabb33;
`;

const SearchRowWrapper = styled(SearchRow)`
  border-radius: 5px;
  width: 250px;
`;
