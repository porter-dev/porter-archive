import React, {
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import _ from "lodash";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { match } from "ts-pattern";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Fieldset from "components/porter/Fieldset";
import Icon from "components/porter/Icon";
import SearchBar from "components/porter/SearchBar";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Toggle from "components/porter/Toggle";
import type { DeploymentTarget } from "lib/hooks/useDeploymentTarget";

import { search } from "shared/search";
import { readableDate } from "shared/string_utils";
import calendar from "assets/calendar-number.svg";
import notFound from "assets/not-found.png";
import pull_request from "assets/pull_request_icon.svg";
import healthy from "assets/status-healthy.png";
import time from "assets/time.png";
import letter from "assets/vector.svg";

import { type ValidTab } from "./PreviewEnvs";

type PreviewEnvGridProps = {
  deploymentTargets: DeploymentTarget[];
  setTab: Dispatch<SetStateAction<ValidTab>>;
};

const PreviewEnvGrid: React.FC<PreviewEnvGridProps> = ({
  deploymentTargets,
  setTab,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [sort, setSort] = useState<"calendar" | "letter">("calendar");

  const filteredEnvs = useMemo(() => {
    const filteredBySearch = search(deploymentTargets ?? [], searchValue, {
      keys: ["namespace"],
      isCaseSensitive: false,
    });

    return match(sort)
      .with("calendar", () =>
        _.sortBy(filteredBySearch, ["created_at"]).reverse()
      )
      .with("letter", () => _.sortBy(filteredBySearch, ["namespace"]))
      .exhaustive();
  }, [deploymentTargets, searchValue, sort]);

  if (deploymentTargets.length === 0) {
    return (
      <Fieldset>
        <CentralContainer>
          <Text size={16}>No preview environments have been deployed yet.</Text>
          <Spacer y={1} />

          <Text color={"helper"}>
            Get started by enabling preview envs for your apps.
          </Text>
          <Spacer y={1} />
          <Button
            onClick={() => {
              setTab("config");
            }}
          >
            Configure Preview Environments
          </Button>
        </CentralContainer>
      </Fieldset>
    );
  }

  if (filteredEnvs.length === 0) {
    let copy =
      "No preview environments exist. To get started with preview environments, enable them in the Settings tab of an existing application.";
    if (searchValue !== "") {
      copy = "No matching environments were found.";
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

  return (
    <>
      <Container row spaced>
        <SearchBar
          value={searchValue}
          setValue={(x) => {
            setSearchValue(x);
          }}
          placeholder="Search environments . . ."
          width="100%"
        />
        <Spacer inline x={2} />
        <Toggle
          items={[
            { label: <ToggleIcon src={calendar} />, value: "calendar" },
            { label: <ToggleIcon src={letter} />, value: "letter" },
          ]}
          active={sort}
          setActive={(x) => {
            if (x === "calendar") {
              setSort("calendar");
            } else {
              setSort("letter");
            }
          }}
        />
      </Container>
      <Spacer y={1} />
      <List>
        {(filteredEnvs ?? []).map((env) => {
          return (
            <Link
              to={`/preview-environments/apps?target=${env.id}`}
              key={env.namespace}
            >
              <Row>
                <Container row>
                  <Spacer inline width="1px" />
                  <Icon height="18px" src={pull_request} />
                  <Spacer inline width="12px" />
                  <Text size={14}>{env.name}</Text>
                  <Spacer inline x={1} />
                  <Icon height="16px" src={healthy} />
                </Container>
                <Spacer height="15px" />
                <Container row>
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
    </>
  );
};

export default PreviewEnvGrid;

const PlaceholderIcon = styled.img`
  height: 13px;
  margin-right: 12px;
  opacity: 0.65;
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

const ToggleIcon = styled.img`
  height: 12px;
  margin: 0 5px;
  min-width: 12px;
`;

const CentralContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: left;
`;
