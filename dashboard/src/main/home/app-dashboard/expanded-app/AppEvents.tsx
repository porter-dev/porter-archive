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
          Approval required for Porter GitHub Action
        </Text>
        <Spacer y={0.5} />
        <Text color="helper">
          We've opened a PR to add the Porter GitHub Action to the {branchName} branch of {repoName}.
        </Text>
        <Spacer y={0.5} />
        <Text color="helper">
          <Link to="/">Merge Porter PR</Link>
        </Text>
      </Fieldset>
    </StyledAppEvents>
  );
};

export default AppEvents;

const StyledAppEvents = styled.div`
`;