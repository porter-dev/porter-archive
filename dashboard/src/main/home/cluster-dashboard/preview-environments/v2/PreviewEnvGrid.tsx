import React, { useMemo } from "react";
import { RawDeploymentTarget } from "./PreviewEnvs";
import { match } from "ts-pattern";
import _ from "lodash";
import styled from "styled-components";
import { Link } from "react-router-dom";

import time from "assets/time.png";
import healthy from "assets/status-healthy.png";
import notFound from "assets/not-found.png";
import pull_request from "assets/pull_request_icon.svg";

import { search } from "shared/search";
import Fieldset from "components/porter/Fieldset";
import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { readableDate } from "shared/string_utils";

type PreviewEnvGridProps = {
  deploymentTargets: RawDeploymentTarget[];
  searchValue: string;
  view: "grid" | "list";
  sort: "letter" | "calendar";
};

const PreviewEnvGrid: React.FC<PreviewEnvGridProps> = ({
  deploymentTargets,
  searchValue,
  view,
  sort,
}) => {
  const filteredEnvs = useMemo(() => {
    const filteredBySearch = search(deploymentTargets ?? [], searchValue, {
      keys: ["selector"],
      isCaseSensitive: false,
    });

    return match(sort)
      .with("calendar", () =>
        _.sortBy(filteredBySearch, ["created_at"]).reverse()
      )
      .with("letter", () => _.sortBy(filteredBySearch, ["selector"]))
      .exhaustive();
  }, [deploymentTargets, searchValue, sort]);

  if (filteredEnvs.length === 0) {
    let copy = "No preview environments exist. To get started with preview environments, enable them in the Settings tab of an existing application."
    if (searchValue !== "") {
      copy = "No matching environments were found."
    }
    return (
      <Fieldset>
        <Container row>
          <PlaceholderIcon src={notFound} />
          <Text color="helper">{copy}</Text>
        </Container>
      </Fieldset>
    );
  }

  return match(view)
    .with("grid", () => (
      <GridList>
        {(filteredEnvs ?? []).map((env) => {
          return (
            <Link
              to={`/preview-environments/apps?target=${env.id}`}
              key={env.selector}
            >
              <Block>
                <Container row>
                  <Icon height="18px" src={pull_request} />
                  <Spacer inline width="12px" />
                  <Text size={14}>{env.selector}</Text>
                  <Spacer inline x={2} />
                </Container>
                <StatusIcon src={healthy} />
                <Container row>
                  <SmallIcon opacity="0.4" src={time} />
                  <Text size={13} color="#ffffff44">
                    {readableDate(env.created_at)}
                  </Text>
                </Container>
              </Block>
            </Link>
          );
        })}
      </GridList>
    ))
    .with("list", () => (
      <List>
        {(filteredEnvs ?? []).map((env) => {
          return (
            <Link
              to={`/preview-environments/apps?target=${env.id}`}
              key={env.selector}
            >
              <Row>
                <Container row>
                  <Spacer inline width="1px" />
                  <Icon height="18px" src={pull_request} />
                  <Spacer inline width="12px" />
                  <Text size={14}>{env.selector}</Text>
                  <Spacer inline x={1} />
                  <Icon height="16px" src={healthy} />
                </Container>
                <Spacer height="15px" />
                <Container row>
                  <Spacer inline x={1} />
                  <SmallIcon opacity="0.4" src={time} />
                  <Text size={13} color="#ffffff44">
                    {readableDate(env.created_at)}
                  </Text>
                </Container>
              </Row>
            </Link>
          );
        })}
      </List>
    ))
    .exhaustive();
};

export default PreviewEnvGrid;

const PlaceholderIcon = styled.img`
  height: 13px;
  margin-right: 12px;
  opacity: 0.65;
`;

const GridList = styled.div`
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
`;

const Block = styled.div`
  height: 150px;
  flex-direction: column;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  padding: 20px;
  color: ${(props) => props.theme.text.primary};
  position: relative;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
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

const StatusIcon = styled.img`
  position: absolute;
  top: 20px;
  right: 20px;
  height: 18px;
`;

const List = styled.div`
  overflow: hidden;
`;

const Row = styled.div<{ isAtBottom?: boolean }>`
  cursor: pointer;
  padding: 15px;
  border-bottom: ${(props) =>
    props.isAtBottom ? "none" : "1px solid #494b4f"};
  background: ${(props) => props.theme.clickable.bg};
  position: relative;
  border: 1px solid #494b4f;
  border-radius: 5px;
  margin-bottom: 15px;
  animation: fadeIn 0.3s 0s;
`;

const SmallIcon = styled.img<{ opacity?: string; height?: string }>`
  margin-left: 2px;
  height: ${(props) => props.height || "14px"};
  opacity: ${(props) => props.opacity || 1};
  filter: grayscale(100%);
  margin-right: 10px;
`;
