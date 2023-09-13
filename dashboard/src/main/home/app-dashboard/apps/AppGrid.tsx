import React, { useMemo } from "react";
import { AppRevisionWithSource } from "./types";
import { search } from "shared/search";
import _ from "lodash";
import { match } from "ts-pattern";
import { Link } from "react-router-dom";

import web from "assets/web.png";
import box from "assets/box.png";
import time from "assets/time.png";
import healthy from "assets/status-healthy.png";
import notFound from "assets/not-found.png";
import github from "assets/github.png";

import Fieldset from "components/porter/Fieldset";
import Container from "components/porter/Container";
import Text from "components/porter/Text";
import styled from "styled-components";
import { PorterApp } from "@porter-dev/api-contracts";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import { readableDate } from "shared/string_utils";

type AppGridProps = {
  apps: AppRevisionWithSource[];
  searchValue: string;
  view: "grid" | "list";
  sort: "letter" | "calendar";
};

const icons = [
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg",
  web,
];

const AppGrid: React.FC<AppGridProps> = ({ apps, searchValue, view, sort }) => {
  console.log("apps", apps);
  const appsWithProto = useMemo(() => {
    return apps.map((app) => {
      return {
        ...app,
        app_revision: {
          ...app.app_revision,
          proto: PorterApp.fromJsonString(atob(app.app_revision.b64_app_proto)),
        },
      };
    });
  }, [apps]);
  console.log("appsWithProto", appsWithProto);

  const filteredApps = useMemo(() => {
    const filteredBySearch = search(appsWithProto ?? [], searchValue, {
      keys: ["name"],
      isCaseSensitive: false,
    });

    return match(sort)
      .with("calendar", () =>
        _.sortBy(filteredBySearch, ["last_deployed"]).reverse()
      )
      .with("letter", () => _.sortBy(filteredBySearch, ["name"]))
      .exhaustive();
  }, [appsWithProto, searchValue, sort]);

  const renderIcon = (bp: string[], size?: string) => {
    var src = box;
    if (bp.length) {
      const [_, name] = bp[0].split("/");
      switch (name) {
        case "ruby":
          src = icons[0];
          break;
        case "nodejs":
          src = icons[1];
          break;
        case "python":
          src = icons[2];
          break;
        case "go":
          src = icons[3];
          break;
        default:
          break;
      }
    }
    return (
      <>
        {size === "larger" ? (
          <Icon height="16px" src={src} />
        ) : (
          <Icon height="18px" src={src} />
        )}
      </>
    );
  };

  const renderSource = (source: AppRevisionWithSource["source"]) => {
    return (
      <>
        {source.repo_name ? (
          <Container row>
            <SmallIcon opacity="0.6" src={github} />
            <Text size={13} color="#ffffff44">
              {source.repo_name}
            </Text>
          </Container>
        ) : (
          <Container row>
            <SmallIcon
              opacity="0.7"
              height="18px"
              src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png"
            />
            <Text truncate={true} size={13} color="#ffffff44">
              {source.image_repo_uri}
            </Text>
          </Container>
        )}
      </>
    );
  };

  if (filteredApps.length === 0) {
    return (
      <Fieldset>
        <Container row>
          <PlaceholderIcon src={notFound} />
          <Text color="helper">No matching apps were found.</Text>
        </Container>
      </Fieldset>
    );
  }

  return match(view)
    .with("grid", () => (
      <GridList>
        {(filteredApps ?? []).map(
          ({ app_revision: { proto, updated_at }, source }, i) => {
            return (
              <Link to={`/apps/${proto.name}`} key={i}>
                <Block>
                  <Container row>
                    {renderIcon(proto.build?.buildpacks ?? [])}
                    <Spacer inline width="12px" />
                    <Text size={14}>{proto.name}</Text>
                    <Spacer inline x={2} />
                  </Container>
                  <StatusIcon src={healthy} />
                  {renderSource(source)}
                  <Container row>
                    <SmallIcon opacity="0.4" src={time} />
                    <Text size={13} color="#ffffff44">
                      {readableDate(updated_at)}
                    </Text>
                  </Container>
                </Block>
              </Link>
            );
          }
        )}
      </GridList>
    ))
    .with("list", () => (
      <List>
        {(filteredApps ?? []).map(
          ({ app_revision: { proto, updated_at }, source }, i) => {
            return (
              <Link to={`/apps/${proto.name}`} key={i}>
                <Row>
                  <Container row>
                    <Spacer inline width="1px" />
                    {renderIcon(proto.build?.buildpacks ?? [], "larger")}
                    <Spacer inline width="12px" />
                    <Text size={14}>{proto.name}</Text>
                    <Spacer inline x={1} />
                    <Icon height="16px" src={healthy} />
                  </Container>
                  <Spacer height="15px" />
                  <Container row>
                    {renderSource(source)}
                    <Spacer inline x={1} />
                    <SmallIcon opacity="0.4" src={time} />
                    <Text size={13} color="#ffffff44">
                      {readableDate(updated_at)}
                    </Text>
                  </Container>
                </Row>
              </Link>
            );
          }
        )}
      </List>
    ))
    .exhaustive();
};

export default AppGrid;

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
