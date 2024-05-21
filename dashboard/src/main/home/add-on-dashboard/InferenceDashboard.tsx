import React, { useContext, useMemo, useState } from "react";
import styled from "styled-components";
import { match, P } from "ts-pattern";

import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import DashboardHeader from "components/porter/DashboardHeader";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import Icon from "components/porter/Icon";
import Link from "components/porter/Link";
import SearchBar from "components/porter/SearchBar";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Toggle, { ToggleIcon } from "components/porter/Toggle";
import { isClientModelAddon, type ClientModelAddon } from "lib/addons";
import { useAddonList } from "lib/hooks/useAddon";
import { useDefaultDeploymentTarget } from "lib/hooks/useDeploymentTarget";

import { Context } from "shared/Context";
import grid from "assets/grid.png";
import inferenceGrad from "assets/inference-grad.svg";
import list from "assets/list.png";
import healthy from "assets/status-healthy.png";

const InferenceDashboard: React.FC = () => {
  const { currentProject, currentCluster } = useContext(Context);
  const { defaultDeploymentTarget, isDefaultDeploymentTargetLoading } =
    useDefaultDeploymentTarget();

  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const { addons, isLoading: isAddonListLoading } = useAddonList({
    projectId: currentProject?.id,
    deploymentTarget: defaultDeploymentTarget,
    includeLegacyAddons: false,
  });

  const models: ClientModelAddon[] = useMemo(() => {
    const modelAddons = addons.filter(isClientModelAddon);

    return modelAddons;
  }, [addons, defaultDeploymentTarget]);

  return (
    <StyledInferenceDashboard>
      <DashboardHeader
        image={inferenceGrad}
        title={
          <Container row>
            Inference
            <Spacer inline x={1} />
            <Badge>Beta</Badge>
          </Container>
        }
        capitalize={false}
        description="Run open source ML models in your own cloud."
      />
      {match([
        currentCluster?.status,
        models.length,
        isAddonListLoading || isDefaultDeploymentTargetLoading,
      ])
        .with(["UPDATING_UNAVAILABLE", P._, P._], () => (
          <ClusterProvisioningPlaceholder />
        ))
        .with([P._, P.number, true], () => <Loading offset="-150px" />)
        .with([P._, 0, false], () => (
          <DashboardPlaceholder>
            <Text size={16}>No ML models have been deployed yet</Text>
            <Spacer y={0.5} />
            <Text color={"helper"}>Get started by deploying a model.</Text>
            <Spacer y={1} />
            <Link to="/inference/new">
              <Button onClick={() => ({})} height="35px" alt>
                Deploy a new model <Spacer inline x={1} />{" "}
                <i className="material-icons" style={{ fontSize: "18px" }}>
                  east
                </i>
              </Button>
            </Link>
          </DashboardPlaceholder>
        ))
        .otherwise(() => (
          <div>
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
                setActive={(s: string) => {
                  setView(s as "grid" | "list");
                }}
              />
              <Spacer inline x={2} />
              <Link to="/models/new">
                <Button onClick={() => {}} height="30px" width="130px">
                  <I className="material-icons">add</I> New model
                </Button>
              </Link>
            </Container>
            <Spacer y={1} />
            {match(view)
              .with("grid", () => (
                <div>
                  {models.map((model) => (
                    <Block
                      to={`/inference/${model.name.value}`}
                      key={model.name.value}
                    >
                      <Container row>
                        <Icon src={model.template.icon} />
                        <Text size={14}>{model.name.value}</Text>
                        <Spacer inline x={2} />
                      </Container>
                      <StatusIcon src={healthy} />
                    </Block>
                  ))}
                </div>
              ))
              .with("list", () => (
                <div>
                  {models.map((model) => (
                    <Row
                      to={`/inference/${model.name.value}`}
                      key={model.name.value}
                    >
                      <Container row>
                        <MidIcon src={model.template.icon} />
                        <Text size={14}>{model.name.value}</Text>
                        <Spacer inline x={1} />
                        <MidIcon src={healthy} height="16px" />
                      </Container>
                    </Row>
                  ))}
                </div>
              ))
              .exhaustive()}
          </div>
        ))}
    </StyledInferenceDashboard>
  );
};

export default InferenceDashboard;

const Badge = styled.div`
  background: linear-gradient(60deg, #4b366d 0%, #6475b9 100%);
  color: white;
  border-radius: 3px;
  padding: 2px 5px;
  margin-right: -5px;
  font-size: 13px;
`;

const StyledInferenceDashboard = styled.div`
  width: 100%;
  height: 100%;
`;

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
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

const StatusIcon = styled.img`
  position: absolute;
  top: 20px;
  right: 20px;
  height: 18px;
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

const MidIcon = styled.img<{ height?: string }>`
  height: ${(props) => props.height || "18px"};
  margin-right: 11px;
`;
