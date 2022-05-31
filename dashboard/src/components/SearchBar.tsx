import React, { useState } from "react";
import Button from "./Button";
import styled from "styled-components";

interface Props {
  setSearchFilter: (x: string) => void;
  disabled: boolean;
  prompt?: string;
  fullWidth?: boolean;
}

const SearchBar: React.FC<Props> = ({
  setSearchFilter,
  disabled,
  prompt,
  fullWidth,
}) => {
  const [searchInput, setSearchInput] = useState("");

  return (
    <SearchRowWrapper fullWidth={fullWidth}>
      <SearchBarWrapper>
        <i className="material-icons">search</i>
        <SearchInput
          value={searchInput}
          onChange={(e: any) => {
            setSearchInput(e.target.value);
          }}
          onKeyPress={({ key }) => {
            if (key === "Enter") {
              setSearchFilter(searchInput);
            }
          }}
          placeholder={prompt}
        />
      </SearchBarWrapper>
      <ButtonWrapper disabled={disabled}>
        <Button
          onClick={() => setSearchFilter(searchInput)}
          disabled={disabled}
        >
          Search
        </Button>
      </ButtonWrapper>
    </SearchRowWrapper>
  );
};

export default SearchBar;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  height: 40px;
  background: #ffffff11;
  border-bottom: 1px solid #606166;
  margin-bottom: 10px;
`;

const SearchRowWrapper = styled(SearchRow)`
  border-bottom: 0;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  ${(props: { fullWidth: boolean }) => {
    if (props.fullWidth) {
      return "width: 100%;";
    }
  }}
`;

const ButtonWrapper = styled.div`
  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }
  height: 40px;
  display: flex;
  align-items: center;
`;

const SearchBarWrapper = styled.div`
  display: flex;
  flex: 1;

  > i {
    color: #aaaabb;
    padding-top: 1px;
    margin-left: 13px;
    font-size: 18px;
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
  height: 20px;
`;
