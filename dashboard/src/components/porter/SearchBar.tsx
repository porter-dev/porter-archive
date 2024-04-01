import React, { useEffect, useState } from "react";
import styled from "styled-components";

import search from "assets/search.png";

type Props = {
  placeholder: string;
  width?: string;
  value: string;
  setValue: (value: string) => void;
  label?: string | React.ReactNode;
  height?: string;
  type?: string;
  error?: string;
  children?: React.ReactNode;
  autoFocus?: boolean;
  onEnter?: () => void;
  style?: React.CSSProperties;
};

const SearchBar: React.FC<Props> = ({
  placeholder,
  width,
  value,
  setValue,
  label,
  height,
  type,
  error,
  children,
  autoFocus,
  onEnter,
  style,
}) => {
  return (
    <Block width={width} style={style}>
      {
        label && (
          <Label>{label}</Label>
        )
      }
      <StyledSearchBar
        style={style}
        width={width}
        height={height}
        hasError={(error && true) || (error === "")}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (onEnter) {
              onEnter();
            }
          }
        }}
      >
        <Icon src={search} />
        <Input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          type={type || "text"}
          autoFocus={autoFocus}
        />
        {
          error && (
            <Error>
              <i className="material-icons">error</i>
              {error}
            </Error>
          )
        }
      </StyledSearchBar>
      {children}
    </Block>
  );
};

export default SearchBar;

const Icon = styled.img`
  position: absolute;
  left: 12px;
  top: 50%;
  opacity: 0.6;
  transform: translateY(-50%);
  height: 11px;
`;

const Block = styled.div<{
  width: string;
}>`
  display: block;
  position: relative;
  width: ${props => props.width || "200px"};
`;

const Label = styled.div`
  font-size: 13px;
  color: #aaaabb;
  margin-bottom: 10px;
`;

const Error = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #ff3b62;
  margin-top: 10px;

  > i {
    font-size: 18px;
    margin-right: 5px;
  }
`;

const StyledSearchBar = styled.div<{
  width: string;
  height: string;
  hasError: boolean;
}>`
  height: ${props => props.height || "30px"};
  padding: 5px 10px;
  width: ${props => props.width || "200px"};
  color: #ffffff;
  font-size: 13px;
  border-radius: 5px;
  background: ${props => props.theme.fg};
  transition: all 0.2s;

  border: 1px solid ${props => props.hasError ? "#ff3b62" : "#494b4f"};
  :hover {
    border: 1px solid ${props => props.hasError ? "#ff3b62" : "#7a7b80"};
  }
`;

const Input = styled.input`
  outline: none;
  background: #00000000;
  border: none;
  width: 100%;
  height: 100%;
  padding-left: 23px;
`;