import React from "react";
import pull_request_icon from "legacy/assets/pull_request_icon.svg";
import refresh from "legacy/assets/refresh.png";
import tag_icon from "legacy/assets/tag.png";
import Container from "legacy/components/porter/Container";
import Icon from "legacy/components/porter/Icon";
import Link from "legacy/components/porter/Link";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import styled from "styled-components";

import { getStatusColor, getStatusIcon } from "../utils";
import {
  Code,
  CommitIcon,
  ImageTagContainer,
  StyledEventCard,
} from "./EventCard";

type Props = {
  imageTag: string;
  rollbackTargetVersionNumber: number;
  gitRepoName?: string;
};

const RollbackEventCard: React.FC<Props> = ({
  imageTag,
  gitRepoName,
  rollbackTargetVersionNumber,
}) => {
  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="13px" src={refresh} />
          <Spacer inline width="10px" />
          <Text>Application auto-rollback</Text>
        </Container>
      </Container>
      <Spacer y={0.5} />
      <Container>
        <Container row>
          <Text>
            {`One or more services failed to deploy, so Porter automatically
            triggered a rollback to ${
              rollbackTargetVersionNumber
                ? `version ${rollbackTargetVersionNumber}`
                : "the previous successful deploy"
            }.`}
          </Text>
        </Container>
        <Spacer y={0.5} />
        <Container row>
          <Icon height="12px" src={getStatusIcon("SUCCESS")} />
          <Spacer inline width="10px" />
          <Text color={getStatusColor("SUCCESS")}>{`Triggered rollback${
            imageTag ? " to" : ""
          }`}</Text>
          <Spacer inline x={0.5} />
          {gitRepoName ? (
            <>
              <ImageTagContainer>
                <Link
                  to={`https://www.github.com/${gitRepoName}/commit/${imageTag}`}
                  target="_blank"
                  showTargetBlankIcon={false}
                >
                  <CommitIcon src={pull_request_icon} />
                  <Code>{imageTag}</Code>
                </Link>
              </ImageTagContainer>
            </>
          ) : imageTag ? (
            <>
              <ImageTagContainer hoverable={false}>
                <TagContainer>
                  <CommitIcon src={tag_icon} />
                  <Code>{imageTag}</Code>
                </TagContainer>
              </ImageTagContainer>
            </>
          ) : null}
        </Container>
      </Container>
    </StyledEventCard>
  );
};

export default RollbackEventCard;

const TagContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 1px;
  padding: 0px 2px;
`;
