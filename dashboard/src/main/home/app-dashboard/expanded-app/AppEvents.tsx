import Loading from "components/Loading";
import Fieldset from "components/porter/Fieldset";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  repoName: string; 
  branchName: string;
};

const AppEvents: React.FC<Props> = ({
  repoName,
  branchName,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Do something
  }, []);

  return (
    <StyledAppEvents>
      <Fieldset>
        <Text size={16}>
          Dream on
        </Text>
        <Spacer y={0.5} />
        <Text color="helper">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </Text>
        <Spacer height="10px" />
      </Fieldset>
    </StyledAppEvents>
  );
};

export default AppEvents;

const StyledAppEvents = styled.div`
`;