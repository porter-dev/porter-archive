import React, { useEffect, useState } from "react";
import styled from "styled-components";

import placeholder from "assets/placeholder.png";

type Props = {
  children: React.ReactNode;
};

const DashboardPlaceholder: React.FC<Props> = ({
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <StyledDashboardPlaceholder>
      <Bg src={placeholder} />
      <Fg>{children}</Fg>
    </StyledDashboardPlaceholder>
  );
};

export default DashboardPlaceholder;

const Fg = styled.div`
  position: relative;
  z-index: 1;
`;

const Bg = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 0;
`;

const StyledDashboardPlaceholder = styled.div<{
}>`
  width: 100%;
  padding: 25px 30px;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
`;