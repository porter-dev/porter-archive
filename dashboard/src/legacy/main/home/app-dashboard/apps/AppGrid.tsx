import React, { useContext, useMemo } from "react";
import { PorterApp } from "@porter-dev/api-contracts";
import notFound from "legacy/assets/not-found.png";
import target from "legacy/assets/target.svg";
import time from "legacy/assets/time.png";
import Container from "legacy/components/porter/Container";
import Fieldset from "legacy/components/porter/Fieldset";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { type ClientAddon } from "legacy/lib/addons";
import { search } from "legacy/shared/search";
import { readableDate } from "legacy/shared/string_utils";
import _ from "lodash";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { match } from "ts-pattern";

import { useDeploymentTarget } from "shared/DeploymentTargetContext";

import { Context } from "../../../../shared/Context";
import { Addon } from "./Addon";
import { AppIcon, AppSource } from "./AppMeta";
import { type AppRevisionWithSource } from "./types";

type AppGridProps = {
  apps: AppRevisionWithSource[];
  addons: ClientAddon[];
  searchValue: string;
  view: "grid" | "list";
  sort: "letter" | "calendar";
};

const AppGrid: React.FC<AppGridProps> = ({
  apps,
  addons,
  searchValue,
  view,
  sort,
}) => {
  const { user } = useContext(Context);
  const { currentDeploymentTarget } = useDeploymentTarget();
  const { currentProject } = useContext(Context);

  const appsWithProto = useMemo(() => {
    return apps.map((app) => {
      return {
        ...app,
        app_revision: {
          ...app.app_revision,
          proto: PorterApp.fromJsonString(
            atob(app.app_revision.b64_app_proto),
            {
              ignoreUnknownFields: true,
            }
          ),
        },
      };
    });
  }, [apps]);

  const filteredApps = useMemo(() => {
    const filteredBySearch = search(appsWithProto ?? [], searchValue, {
      keys: ["source.name"],
      isCaseSensitive: false,
    });

    return match(sort)
      .with("calendar", () =>
        _.sortBy(filteredBySearch, [
          (a) => {
            return a.app_revision.updated_at;
          },
        ]).reverse()
      )
      .with("letter", () =>
        _.sortBy(filteredBySearch, [
          (a) => {
            return a.source.name;
          },
        ])
      )
      .exhaustive();
  }, [appsWithProto, searchValue, sort]);

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
          (
            {
              app_revision: {
                proto,
                updated_at: updatedAt,
                deployment_target: deploymentTarget,
              },
              source,
            },
            i
          ) => {
            let appLink = `/apps/${proto.name}`;
            if (currentProject?.managed_deployment_targets_enabled) {
              appLink = `/apps/${proto.name}/activity?target=${deploymentTarget.id}`;
            }
            if (currentDeploymentTarget?.is_preview) {
              appLink = `/preview-environments/apps/${proto.name}/activity?target=${currentDeploymentTarget.id}`;
            }

            return (
              <Link to={appLink} key={i}>
                <Block
                  locked={false}
                  appId={user.isPorterUser ? String(source.id) : ""}
                >
                  <Container row>
                    <AppIcon
                      buildpacks={proto.build?.buildpacks ?? []}
                      size="larger"
                    />
                    <Spacer inline width="12px" />
                    <Text size={14}>{proto.name}</Text>
                    <Spacer inline x={2} />
                  </Container>
                  {/** TODO: make the status icon dynamic */}
                  {/* <StatusIcon src={healthy} /> */}
                  <AppSource
                    source={{
                      from: "porter_apps",
                      details: source,
                    }}
                  />
                  {currentProject?.managed_deployment_targets_enabled &&
                    !currentDeploymentTarget?.is_preview && (
                      <Container row>
                        <SmallIcon opacity="0.4" src={target} />
                        <Text size={13} color="#ffffff44">
                          {deploymentTarget.name}
                        </Text>
                      </Container>
                    )}
                  <Container row>
                    <SmallIcon opacity="0.4" src={time} />
                    <Text size={13} color="#ffffff44">
                      {readableDate(updatedAt)}
                    </Text>
                  </Container>
                </Block>
              </Link>
            );
          }
        )}
        {addons.map((a) => {
          return <Addon addon={a} view={view} key={a.name.value} />;
        })}
      </GridList>
    ))
    .with("list", () => (
      <List>
        {(filteredApps ?? []).map(
          ({ app_revision: { proto, updated_at: updatedAt }, source }, i) => {
            return (
              <Link
                to={
                  currentDeploymentTarget?.is_preview
                    ? `/preview-environments/apps/${proto.name}/activity?target=${currentDeploymentTarget.id}`
                    : `/apps/${proto.name}`
                }
                key={i}
              >
                <Row>
                  <Container row>
                    <Spacer inline width="1px" />
                    <AppIcon
                      buildpacks={proto.build?.buildpacks ?? []}
                      size="larger"
                    />
                    <Spacer inline width="12px" />
                    <Text size={14}>{proto.name}</Text>
                    <Spacer inline x={1} />
                    {/** TODO: make the status icon dynamic */}
                    {/* <Icon height="16px" src={healthy} /> */}
                  </Container>
                  <Spacer height="15px" />
                  <Container row>
                    <AppSource
                      source={{
                        from: "porter_apps",
                        details: source,
                      }}
                    />
                    <Spacer inline x={1} />
                    <SmallIcon opacity="0.4" src={time} />
                    <Text size={13} color="#ffffff44">
                      {readableDate(updatedAt)}
                    </Text>
                  </Container>
                </Row>
              </Link>
            );
          }
        )}
        {addons.map((a) => {
          return <Addon addon={a} view={view} key={a.name.value} />;
        })}
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

export const Block = styled.div<{ locked?: boolean; appId?: string }>`
  height: 150px;
  flex-direction: column;
  display: flex;
  justify-content: space-between;
  cursor: ${(props) => (props.locked ? "default" : "pointer")};
  padding: 20px;
  color: ${(props) => props.theme.text.primary};
  position: relative;
  transition: all 0.2s;
  border-radius: 5px;
  background: ${(props) =>
    props.locked ? props.theme.fg : props.theme.clickable.bg};
  border: 1px solid #494b4f;

  :hover {
    border: ${(props) => (props.locked ? "" : `1px solid #7a7b80`)};

    ::after {
      content: ${(props) =>
        props.locked || !props.appId ? "''" : `"AppID: ${props.appId}"`};
      position: absolute;
      top: 2px;
      right: 2px;
      background: ${(props) => props.appId && `#ffffff44`};
      opacity: 0.3;
      padding: 5px;
      border-radius: 4px;
      font-size: 12px;
    }
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
const List = styled.div`
  overflow: hidden;
`;

export const Row = styled.div<{ isAtBottom?: boolean; locked?: boolean }>`
  cursor: ${(props) => (props.locked ? "default" : "pointer")};
  padding: 15px;
  border-bottom: ${(props) =>
    props.isAtBottom ? "none" : "1px solid #494b4f"};
  background: ${(props) =>
    props.locked ? props.theme.fg : props.theme.clickable.bg};
  position: relative;
  border: 1px solid #494b4f;
  border-radius: 5px;
  margin-bottom: 15px;
  animation: fadeIn 0.3s 0s;
  transition: all 0.2s;
`;

const SmallIcon = styled.img<{ opacity?: string; height?: string }>`
  margin-left: 2px;
  height: ${(props) => props.height || "14px"};
  opacity: ${(props) => props.opacity || 1};
  filter: grayscale(100%);
  margin-right: 10px;
`;
