import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  children: React.ReactNode;
  background?: string;
};

const Fieldset: React.FC<Props> = ({
  children,
  background,
}) => {
  const getBackground = () => {
    switch (background) {
      case "dark":
        return "#1b1d2688";
      default:
        return background;
    }
  };
  return (
    <StyledFieldset background={getBackground()}>
      {children}
    </StyledFieldset>
  );
};

export default Fieldset;

const StyledFieldset = styled.div<{
  background?: string;
}>`
  position: relative;
  padding: 25px;
  border-radius: 5px;
  background: ${props => props.background || "#26292e"};
  border: 1px solid #494b4f;
  font-size: 13px;
`;