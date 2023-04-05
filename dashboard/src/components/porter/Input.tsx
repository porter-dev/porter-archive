import React, { useEffect, useState } from "react";
import styled from "styled-components";

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
};

const Input: React.FC<Props> = ({
  placeholder,
  width,
  value,
  setValue,
  label,
  height,
  type,
  error,
  children,
}) => {
  return (
    <Block width={width}>
      {
        label && (
          <Label>{label}</Label>
        )
      }
      <StyledInput
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        width={width}
        height={height}
        type={type || "text"}
        hasError={(error && true) || (error === "")}
      />
      {
        error && (
          <Error>
            <i className="material-icons">error</i>
            {error}
          </Error>
        )
      }
      {children}
    </Block>
  );
};

export default Input;

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


const StyledInput = styled.input<{
  width: string;
  height: string;
  hasError: boolean;
}>`
  height: ${props => props.height || "35px"};
  padding: 5px 10px;
  width: ${props => props.width || "200px"};
  color: #ffffff;
  font-size: 13px;
  outline: none;
  border-radius: 5px;
  background: #26292e;

  border: 1px solid ${props => props.hasError ? "#ff3b62" : "#494b4f"};
  :hover {
    border: 1px solid ${props => props.hasError ? "#ff3b62" : "#7a7b80"};
  }
`;