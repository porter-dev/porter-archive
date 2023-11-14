import React, { useState } from "react";
import Button from "./Button";
import styled from "styled-components";
import dayjs from "dayjs";
import SearchBar from "./porter/SearchBar";

type Props = {
  searchText: string;
  setSearchText: (x: string) => void;
  setEnteredSearchText: (x: string) => void;
  setSelectedDate: () => void;
}

const escapeExp = (str: string) => {
  // regex special character need to be escaped twice
  const regEscaped = str.replace(/[.*+?^${}()|[\]\\]/g, "\\\\$&");
  // double quotes need to be escaped once
  const quoteEscaped = regEscaped.replace(/["]/g, "\\$&");
  return quoteEscaped;
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
        setEnteredSearchText(escapeExp(searchText));
        setSelectedDate();
      }}
      placeholder="Search logs . . ."
    />
  );
};

export default LogSearchBar;