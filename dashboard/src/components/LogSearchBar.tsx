import React, { useState } from "react";
import Button from "./Button";
import styled from "styled-components";
import dayjs from "dayjs";
import SearchBar from "./porter/SearchBar";

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
    <SearchBar
      width="250px"
      value={searchText}
      setValue={(x: any): any => {
        setSearchText(x);
      }}
      onEnter={() => {
        setEnteredSearchText(searchText);
        setSelectedDate();
      }}
      placeholder="Search logs . . ."
    />
  );
};

export default LogSearchBar;