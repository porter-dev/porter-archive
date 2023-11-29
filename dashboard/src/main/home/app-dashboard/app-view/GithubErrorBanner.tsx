import React, { type Dispatch, type SetStateAction } from "react";
import AnimateHeight from "react-animate-height";
import styled from "styled-components";
import { match } from "ts-pattern";

import Banner from "components/porter/Banner";
import Spacer from "components/porter/Spacer";
import { type GithubResultErrorCode } from "lib/github/workflows";

type Props = {
  appName: string;
  workflowRerunError: GithubResultErrorCode | null;
  setWorkflowRerunError: Dispatch<SetStateAction<GithubResultErrorCode | null>>;
};

export const GithubErrorBanner: React.FC<Props> = ({
  appName,
  workflowRerunError,
  setWorkflowRerunError,
}) => {
  return (
    <AnimateHeight height={workflowRerunError ? "auto" : 0}>
      <Banner
        type="warning"
        suffix={
          <CloseButton
            onClick={() => {
              setWorkflowRerunError(null);
            }}
          >
            <i className="material-icons">close</i>
          </CloseButton>
        }
      >
        <BannerContents>
          <b>App updated but Github workflow could not run</b>
          {match(workflowRerunError)
            .with("FILE_NOT_FOUND", () => (
              <>
                Workflow file <Code>{`porter_stack_${appName}.yml`}</Code> not
                found.
              </>
            ))
            .with("NO_PERMISSION", () => (
              <>
                Make sure you have given Porter permission to access
                repositories on your behalf. GitHub integrations can be viewed
                under account settings.
              </>
            ))
            .otherwise(() => null)}
        </BannerContents>
        <Spacer inline width="5px" />
      </Banner>
      <Spacer y={1} />
    </AnimateHeight>
  );
};

const Code = styled.span`
  font-family: monospace;
`;

const BannerContents = styled.div`
  display: flex;
  flex-direction: column;
  row-gap: 0.5rem;
`;

const CloseButton = styled.div`
  display: block;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  border-radius: 50%;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }

  > i {
    font-size: 20px;
    color: #aaaabb;
  }
`;
