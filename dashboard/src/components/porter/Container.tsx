import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  children: React.ReactNode;
  row?: boolean;
  column?: boolean;
  spaced?: boolean;
  alignItems?: string;
};

const Container: React.FC<Props> = ({
  children,
  row,
  spaced,
  column,
  alignItems,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <StyledContainer
      spaced={spaced}
      row={row}
      column={column}
      alignItems={alignItems}
    >
      {children}
    </StyledContainer>
  );
};

export default Container;

const StyledContainer = styled.div<{
  row?: boolean;
  column?: boolean;
  spaced?: boolean;
  alignItems?: string
}>`
  display: ${props => props.row || props.column ? "flex" : "block"};
  flex-direction: ${props => props.row ? "row" : "column"};
  align-items: ${props => props.alignItems ? props.alignItems : "center"};
  justify-content: ${props => props.spaced ? "space-between" : "flex-start"};
`;