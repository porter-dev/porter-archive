import React, { useContext, useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { Link, LinkProps } from "react-router-dom";
import styled from "styled-components";

import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import Fieldset from "components/porter/Fieldset";
import Icon from "components/porter/Icon";
import PorterLink from "components/porter/Link";
import SearchBar from "components/porter/SearchBar";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Toggle from "components/porter/Toggle";

import api from "shared/api";
import { Context } from "shared/Context";
import { search } from "shared/search";
import { readableDate } from "shared/string_utils";
import applications from "assets/applications.svg";
import box from "assets/box.png";
import calendar from "assets/calendar-number.svg";
import github from "assets/github.png";
import grid from "assets/grid.png";
import list from "assets/list.png";
import notFound from "assets/not-found.png";
import healthy from "assets/status-healthy.png";
import time from "assets/time.png";
import letter from "assets/vector.svg";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";

type Props = {};

const icons = [
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg",
  applications,
];

const namespaceBlacklist = [
  "cert-manager",
  "default",
  "ingress-nginx",
  "kube-node-lease",
  "kube-public",
  "kube-system",
  "monitoring",
];

const AppDashboard: React.FC<Props> = ({}) => {
  const { currentProject, currentCluster, setFeaturePreview } =
    useContext(Context);
  const [apps, setApps] = useState([]);
  const [charts, setCharts] = useState([]);
  const [error, setError] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState("grid");
  const [sort, setSort] = useState<"calendar" | "letter">("calendar");

  const [isLoading, setIsLoading] = useState(true);
  const [shouldLoadTime, setShouldLoadTime] = useState(true);

  const filteredApps = useMemo(() => {
    const filteredBySearch = search(apps ?? [], searchValue, {
      keys: ["name"],
      isCaseSensitive: false,
    });

    if (sort === "letter") {
      return _.sortBy(filteredBySearch, ["name"]);
    } else if (sort === "calendar") {
      return _.sortBy(filteredBySearch, ["last_deployed"]).reverse(); // Assuming that the latest date should come first.
    }

    return filteredBySearch; // default
  }, [apps, searchValue, sort]);

  const getApps = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPorterApps(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );
      const apps = res.data;
      const timeRes = await Promise.all(
        apps.map(async (app: any) => {
          return await api.getCharts(
            "<token>",
            {
              limit: 1,
              skip: 0,
              byDate: false,
              statusFilter: [
                "deployed",
                "uninstalled",
                "pending",
                "pending-install",
                "pending-upgrade",
                "pending-rollback",
                "failed",
              ],
            },
            {
              id: currentProject.id,
              cluster_id: currentCluster.id,
              namespace: `porter-stack-${app.name}`,
            }
          );
        })
      );
      apps.forEach((app: any, i: number) => {
        if (timeRes?.[i]?.data?.[0]?.info?.last_deployed != null) {
          app.last_deployed = readableDate(
            timeRes[i].data[0].info.last_deployed
          );
        }
      });
      setApps(apps.reverse());
      setIsLoading(false);
    } catch (err) {
      setError(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentProject?.id > 0 && currentCluster?.id > 0) {
      getApps();
    }
  }, [currentCluster, currentProject]);

  const renderSource = (app: any) => {
    return (
      <>
        {app.repo_name ? (
          <Container row>
            <SmallIcon opacity="0.6" src={github} />
            <Text size={13} color="#ffffff44">
              {app.repo_name}
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
              {app.image_repo_uri}
            </Text>
          </Container>
        )}
      </>
    );
  };

  const updateStackStartedStep = async () => {
    try {
      await api.updateStackStep(
        "<token>",
        {
          step: "stack-launch-start",
        },
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      );
    } catch (err) {
      // TODO: handle error
    }
  };

  const renderIcon = (b: string, size?: string) => {
    let src = box;
    if (b) {
      const bp = b.split(",")[0]?.split("/")[1];
      switch (bp) {
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

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={applications}
        title="Applications"
        description="Web services, workers, and jobs for this project."
        disableLineBreak
      />
      {currentCluster?.status === "UPDATING_UNAVAILABLE" ? (
        <ClusterProvisioningPlaceholder />
      ) : apps.length === 0 ? (
        isLoading ? (
          <Loading offset="-150px" />
        ) : (
          <DashboardPlaceholder>
            <Text size={16}>No apps have been deployed yet</Text>
            <Spacer y={0.5} />
            <Text color={"helper"}>Get started by deploying your app.</Text>
            <Spacer y={1} />
            <PorterLink to="/apps/new/app">
              <Button
                alt
                onClick={async () => {
                  await updateStackStartedStep();
                }}
                height="35px"
              >
                Deploy app <Spacer inline x={1} />{" "}
                <i className="material-icons" style={{ fontSize: "18px" }}>
                  east
                </i>
              </Button>
            </PorterLink>
          </DashboardPlaceholder>
        )
      ) : (
        <>
          <Container row spaced>
            <SearchBar
              value={searchValue}
              setValue={(x) => {
                if (x === "open_sesame") {
                  setFeaturePreview(true);
                }
                setSearchValue(x);
              }}
              placeholder="Search applications . . ."
              width="100%"
            />
            <Spacer inline x={2} />
            <Toggle
              items={[
                { label: <ToggleIcon src={calendar} />, value: "calendar" },
                { label: <ToggleIcon src={letter} />, value: "letter" },
              ]}
              active={sort}
              setActive={setSort}
            />
            <Spacer inline x={1} />

            <Toggle
              items={[
                { label: <ToggleIcon src={grid} />, value: "grid" },
                { label: <ToggleIcon src={list} />, value: "list" },
              ]}
              active={view}
              setActive={setView}
            />

            <Spacer inline x={2} />
            <PorterLink to="/apps/new/app">
              <Button
                onClick={async () => {
                  await updateStackStartedStep();
                }}
                height="30px"
                width="160px"
              >
                <I className="material-icons">add</I> New application
              </Button>
            </PorterLink>
          </Container>
          <Spacer y={1} />

          {filteredApps.length === 0 ? (
            <Fieldset>
              <Container row>
                <PlaceholderIcon src={notFound} />
                <Text color="helper">No matching apps were found.</Text>
              </Container>
            </Fieldset>
          ) : isLoading ? (
            <Loading offset="-150px" />
          ) : view === "grid" ? (
            <GridList>
              {(filteredApps ?? []).map((app: any, i: number) => {
                if (!namespaceBlacklist.includes(app.name)) {
                  return (
                    <Link to={`/apps/${app.name}`} key={i}>
                      <Block>
                        <Container row>
                          {renderIcon(app.buildpacks)}
                          <Spacer inline width="12px" />
                          <Text size={14}>{app.name}</Text>
                          <Spacer inline x={2} />
                        </Container>
                        <StatusIcon src={healthy} />
                        {renderSource(app)}
                        <Container row>
                          <SmallIcon opacity="0.4" src={time} />
                          <Text size={13} color="#ffffff44">
                            {app.last_deployed}
                          </Text>
                        </Container>
                      </Block>
                    </Link>
                  );
                }
              })}
            </GridList>
          ) : (
            <List>
              {(filteredApps ?? []).map((app: any, i: number) => {
                if (!namespaceBlacklist.includes(app.name)) {
                  return (
                    <Link to={`/apps/${app.name}`} key={i}>
                      <Row>
                        <Container row>
                          <Spacer inline width="1px" />
                          {renderIcon(app.buildpacks, "larger")}
                          <Spacer inline width="12px" />
                          <Text size={14}>{app.name}</Text>
                          <Spacer inline x={1} />
                          <Icon height="16px" src={healthy} />
                        </Container>
                        <Spacer height="15px" />
                        <Container row>
                          {renderSource(app)}
                          <Spacer inline x={1} />
                          <SmallIcon opacity="0.4" src={time} />
                          <Text size={13} color="#ffffff44">
                            {app.last_deployed}
                          </Text>
                        </Container>
                      </Row>
                    </Link>
                  );
                }
              })}
            </List>
          )}
        </>
      )}
      <Spacer y={5} />
    </StyledAppDashboard>
  );
};

export default AppDashboard;

const PlaceholderIcon = styled.img`
  height: 13px;
  margin-right: 12px;
  opacity: 0.65;
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

const List = styled.div`
  overflow: hidden;
`;

const ToggleIcon = styled.img`
  height: 12px;
  margin: 0 5px;
  min-width: 12px;
`;

const StatusIcon = styled.img`
  position: absolute;
  top: 20px;
  right: 20px;
  height: 18px;
`;

const SmallIcon = styled.img<{ opacity?: string; height?: string }>`
  margin-left: 2px;
  height: ${(props) => props.height || "14px"};
  opacity: ${(props) => props.opacity || 1};
  filter: grayscale(100%);
  margin-right: 10px;
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

const GridList = styled.div`
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
`;

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
`;

const StyledAppDashboard = styled.div`
  width: 100%;
  height: 100%;
`;

const CentralContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: left;
`;
