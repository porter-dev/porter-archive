import React from "react";
import styled from "styled-components";

type Props = {
  children: React.ReactNode;
  background?: string;
  row?: boolean;
};

const Fieldset: React.FC<Props> = ({ children, background, row }) => {
  const getBackground = () => {
    switch (background) {
      case "dark":
        return "#1b1d2688";
      default:
        return background;
    }
  };
  return (
    <StyledFieldset background={getBackground()} row={row}>
      {children}
    </StyledFieldset>
  );
};

export default Fieldset;

const StyledFieldset = styled.div<{
  background?: string;
  row?: boolean;
}>`
  position: relative;
  padding: ${(props) => (props.row ? "15px 20px" : "25px")};
  border-radius: 5px;
  background: ${(props) => props.background || props.theme.fg};
  border: 1px solid #494b4f;
  font-size: 13px;
`;
