import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  placeholder: string;
  width?: string;
  value: string;
  setValue: (value: string) => void;
};

const Input: React.FC<Props> = ({
  placeholder,
  width,
  value,
  setValue,
}) => {
  return (
    <StyledInput
      value={value}
      onChange={e => setValue(e.target.value)}
      placeholder={placeholder}
      width={width}
    />
  );
};

export default Input;

const StyledInput = styled.input<{
  width: string;
}>`
  height: 35px;
  padding: 5px 10px;
  width: ${props => props.width || "200px"};
  color: white;
  font-saize: 13px;
  outline: none;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
`;