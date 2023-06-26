import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
};

const TemplateComponent: React.FC<Props> = ({
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Do something
  }, []);

  return (
    <StyledTemplateComponent>
    </StyledTemplateComponent>
  );
};

export default TemplateComponent;

const StyledTemplateComponent = styled.div`
width: 100%;
animation: fadeIn 0.3s 0s;
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
`;