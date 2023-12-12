import React from "react";
import styled from "styled-components";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import pull_request_icon from "assets/pull_request_icon.svg";
import refresh from "assets/refresh.png";
import tag_icon from "assets/tag.png";

import { type PorterAppRollbackEvent } from "../types";
import { getStatusColor, getStatusIcon } from "../utils";
import {
  Code,
  CommitIcon,
  ImageTagContainer,
  StyledEventCard,
} from "./EventCard";

type Props = {
  event: PorterAppRollbackEvent;
  gitCommitUrl: string;
  displayCommitSha: string;
};

const RollbackEventCard: React.FC<Props> = ({
  event,
  gitCommitUrl,
  displayCommitSha,
}) => {
  const renderStatusText = (): JSX.Element => {
    const color = getStatusColor("SUCCESS");
    const text =
      (gitCommitUrl && displayCommitSha) || event.metadata.image_tag
        ? "Rolled back to"
        : "Rolled back";
    return <Text color={color}>{text}</Text>;
  };

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="13px" src={refresh} />
          <Spacer inline width="10px" />
          <Text>Application rollback</Text>
        </Container>
      </Container>
      <Spacer y={0.5} />
      <Container row spaced>
        <Container row>
          <Icon height="12px" src={getStatusIcon("SUCCESS")} />
          <Spacer inline width="10px" />
          {renderStatusText()}
          <Spacer inline x={0.5} />
          {gitCommitUrl && displayCommitSha ? (
            <>
              <ImageTagContainer>
                <Link
                  to={gitCommitUrl}
                  target="_blank"
                  showTargetBlankIcon={false}
                >
                  <CommitIcon src={pull_request_icon} />
                  <Code>{displayCommitSha}</Code>
                </Link>
              </ImageTagContainer>
            </>
          ) : event.metadata.image_tag ? (
            <>
              <ImageTagContainer hoverable={false}>
                <TagContainer>
                  <CommitIcon src={tag_icon} />
                  <Code>{event.metadata.image_tag}</Code>
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
