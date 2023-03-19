import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  placeholder: string;
};

const Input: React.FC<Props> = ({
  placeholder,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Do something
  }, []);

  return (
    <StyledInput placeholder={placeholder}>
    </StyledInput>
  );
};

export default Input;

const StyledInput = styled.input`
`;