import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  pull_request_url: string;
  branchName: string;
  repoName: string;
};

const GHABanner: React.FC<Props> = ({
  pull_request_url,
  branchName,
  repoName,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Do something
  }, []);

  return (
    <StyledGHABanner>
      <>
        {appData.app.pull_request_url ? (
          <Banner type="warning">
            Your application will not be available until you merge
            <Spacer inline width="5px" />
            <Link
              to={appData.app.pull_request_url}
              underline
            >
              this PR
            </Link>
            <Spacer inline width="5px" />
            into your <Mono>{appData.app.git_branch}</Mono> branch.
          </Banner>
        ) : (
          <Banner type="warning">
            Your application will not be available until you add the Porter GitHub Action to your <Mono>{appData.app.git_branch}</Mono> branch.
            <Spacer inline width="5px" />
            <Link
              to={appData.app.pull_request_url}
              underline
            >
              See details
            </Link>
          </Banner>
        )}
      </>
    </StyledGHABanner>
  );
};

export default GHABanner;

const StyledGHABanner = styled.div`
`;