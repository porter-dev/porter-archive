import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  children: React.ReactNode;
  row?: boolean;
};

const Container: React.FC<Props> = ({
  children,
  row,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <StyledContainer
      row={row}
    >
      {children}
    </StyledContainer>
  );
};

export default Container;

const StyledContainer = styled.div<{
  row: boolean;
}>`
  display: ${props => props.row ? "flex" : "block"};
  align-items: center;
`;