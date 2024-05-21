import React, { useContext, useMemo, useState } from "react";
import _ from "lodash";
import { Link } from "react-router-dom";
import styled from "styled-components";

import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import Fieldset from "components/porter/Fieldset";
import PorterLink from "components/porter/Link";
import SearchBar from "components/porter/SearchBar";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Toggle from "components/porter/Toggle";
import { type ClientAddon, type LegacyClientAddon } from "lib/addons";
import { useAddonList } from "lib/hooks/useAddon";
import { useDefaultDeploymentTarget } from "lib/hooks/useDeploymentTarget";

import { Context } from "shared/Context";
import { hardcodedIcons } from "shared/hardcodedNameDict";
import addOnGrad from "assets/add-on-grad.svg";
import grid from "assets/grid.png";
import list from "assets/list.png";
import notFound from "assets/not-found.png";
import healthy from "assets/status-healthy.png";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";

// filter out postgres and redis addons because those are managed in the datastores tab now
// filter out model template addons because those are managed in the infrastructure tab
const isDisplayableAddon = (
  addon: ClientAddon | LegacyClientAddon
): boolean => {
  return "chart" in addon
    ? true
    : addon.config.type !== "postgres" &&
        addon.config.type !== "redis" &&
        !addon.template.isModelTemplate;
};

const AddonDashboard: React.FC = () => {
  const { currentProject, currentCluster } = useContext(Context);
  const { defaultDeploymentTarget, isDefaultDeploymentTargetLoading } =
    useDefaultDeploymentTarget();

  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState("grid");

  const {
    addons,
    legacyAddons,
    isLoading: isAddonListLoading,
    isLegacyAddonsLoading,
  } = useAddonList({
    projectId: currentProject?.id,
    deploymentTarget: defaultDeploymentTarget,
  });

  const filteredAddons: Array<ClientAddon | LegacyClientAddon> = useMemo(() => {
    const legacyDisplayableAddons = legacyAddons.sort((a, b) => {
      return a.info.last_deployed > b.info.last_deployed ? -1 : 1;
    });

    // If an addon name exists in both the legacy and new addon lists, show the new addon
    const uniqueDisplayableAddons: Array<ClientAddon | LegacyClientAddon> = [
      ...addons,
      ...legacyDisplayableAddons.filter(
        (a) => !addons.some((b) => b.name.value === a.name)
      ),
    ].filter(isDisplayableAddon);

    return uniqueDisplayableAddons;
  }, [addons, legacyAddons, defaultDeploymentTarget]);

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={addOnGrad}
        title="Add-ons"
        capitalize={false}
        description="Add-ons and supporting workloads for this project."
        disableLineBreak
      />
      {currentCluster?.status === "UPDATING_UNAVAILABLE" ? (
        <ClusterProvisioningPlaceholder />
      ) : currentProject?.sandbox_enabled ? (
        <DashboardPlaceholder>
          <Text size={16}>Add-ons are not enabled for sandbox users</Text>
          <Spacer y={0.5} />
          <Text color={"helper"}>
            Eject to your own cloud account to enable Porter add-ons.
          </Text>
          <Spacer y={1} />
          <PorterLink to="https://docs.porter.run/other/eject">
            <Button alt height="35px">
              Request ejection
            </Button>
          </PorterLink>
        </DashboardPlaceholder>
      ) : filteredAddons.length === 0 ||
        (filteredAddons.length === 0 && searchValue === "") ? (
        isDefaultDeploymentTargetLoading ||
        (isAddonListLoading && isLegacyAddonsLoading) ? (
          <Loading offset="-150px" />
        ) : (
          <DashboardPlaceholder>
            <Text size={16}>No add-ons have been created yet</Text>
            <Spacer y={0.5} />
            <Text color={"helper"}>
              Deploy from our suite of curated add-ons.
            </Text>
            <Spacer y={1} />
            <Link to="/addons/new">
              <Button alt onClick={() => {}} height="35px">
                Deploy a new add-on <Spacer inline x={1} />{" "}
                <i className="material-icons" style={{ fontSize: "18px" }}>
                  east
                </i>
              </Button>
            </Link>
          </DashboardPlaceholder>
        )
      ) : (
        <>
          <Container row spaced>
            <SearchBar
              value={searchValue}
              setValue={setSearchValue}
              placeholder="Search add-ons . . ."
              width="100%"
            />
            <Spacer inline x={2} />
            <Toggle
              items={[
                { label: <ToggleIcon src={grid} />, value: "grid" },
                { label: <ToggleIcon src={list} />, value: "list" },
              ]}
              active={view}
              setActive={setView}
            />
            <Spacer inline x={2} />
            <Link to="/addons/new">
              <Button onClick={() => {}} height="30px" width="130px">
                <I className="material-icons">add</I> New add-on
              </Button>
            </Link>
          </Container>
          <Spacer y={1} />

          {filteredAddons.length === 0 ? (
            <Fieldset>
              <Container row>
                <PlaceholderIcon src={notFound} />
                <Text color="helper">
                  {searchValue === ""
                    ? "No add-ons have been deployed yet."
                    : "No matching add-ons were found."}
                </Text>
              </Container>
            </Fieldset>
          ) : isDefaultDeploymentTargetLoading ||
            (isAddonListLoading && isLegacyAddonsLoading) ? (
            <Loading offset="-150px" />
          ) : view === "grid" ? (
            <GridList>
              {filteredAddons.map((addon: ClientAddon | LegacyClientAddon) => {
                const isLegacyAddon = "chart" in addon;
                if (isLegacyAddon) {
                  return (
                    <Block
                      to={`/applications/${currentCluster?.name}/${addon.namespace}/${addon.name}`}
                      key={addon.name}
                    >
                      <Container row>
                        <Icon
                          src={
                            hardcodedIcons[addon.chart?.metadata?.name ?? ""] ||
                            addon.chart?.metadata?.icon
                          }
                        />
                        <Text size={14}>{addon.name}</Text>
                        <Spacer inline x={2} />
                      </Container>
                      <StatusIcon src={healthy} />
                    </Block>
                  );
                }
                return (
                  <Block
                    to={`/addons/${addon.name.value}`}
                    key={addon.name.value}
                  >
                    <Container row>
                      <Icon src={addon.template.icon} />
                      <Text size={14}>{addon.name.value}</Text>
                      <Spacer inline x={2} />
                    </Container>
                    <StatusIcon src={healthy} />
                  </Block>
                );
              })}
            </GridList>
          ) : (
            <List>
              {filteredAddons.map((addon: ClientAddon | LegacyClientAddon) => {
                const isLegacyAddon = "chart" in addon;
                if (isLegacyAddon) {
                  return (
                    <Row
                      to={`/applications/${currentCluster?.name}/${addon.namespace}/${addon.name}`}
                      key={addon.name}
                    >
                      <Container row>
                        <MidIcon
                          src={
                            hardcodedIcons[addon.chart?.metadata?.name ?? ""] ||
                            addon.chart?.metadata?.icon
                          }
                        />
                        <Text size={14}>{addon.name}</Text>
                        <Spacer inline x={1} />
                        <MidIcon src={healthy} height="16px" />
                      </Container>
                    </Row>
                  );
                }
                return (
                  <Row
                    to={`/addons/${addon.name.value}`}
                    key={addon.name.value}
                  >
                    <Container row>
                      <MidIcon src={addon.template.icon} />
                      <Text size={14}>{addon.name.value}</Text>
                      <Spacer inline x={1} />
                      <MidIcon src={healthy} height="16px" />
                    </Container>
                  </Row>
                );
              })}
            </List>
          )}
        </>
      )}
      <Spacer y={5} />
    </StyledAppDashboard>
  );
};

export default AddonDashboard;

const PlaceholderIcon = styled.img`
  height: 13px;
  margin-right: 12px;
  opacity: 0.65;
`;

const Row = styled(Link)<{ isAtBottom?: boolean }>`
  cursor: pointer;
  display: block;
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

const Icon = styled.img`
  height: 20px;
  margin-right: 13px;
`;

const MidIcon = styled.img<{ height?: string }>`
  height: ${(props) => props.height || "18px"};
  margin-right: 11px;
`;

const Block = styled(Link)`
  height: 75px;
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
