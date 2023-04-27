import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  children: React.ReactNode;
  row?: boolean;
  spaced?: boolean;
};

const Container: React.FC<Props> = ({
  children,
  row,
  spaced,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <StyledContainer
      spaced={spaced}
      row={row}
    >
      {children}
    </StyledContainer>
  );
};

export default Container;

const StyledContainer = styled.div<{
  row: boolean;
  spaced: boolean;
}>`
  display: ${props => props.row ? "flex" : "block"};
  align-items: center;
  justify-content: ${props => props.spaced ? "space-between" : "flex-start"};
`;