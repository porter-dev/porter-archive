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
`;