import React, { useState, useContext, useCallback } from "react";
import styled from "styled-components";
import _, { set } from "lodash";

import web from "assets/web.png";
import grid from "assets/grid.png";
import list from "assets/list.png";
import letter from "assets/vector.svg";
import calendar from "assets/calendar-number.svg";
import pull_request from "assets/pull_request_icon.svg";

import { Context } from "shared/Context";
import api from "shared/api";

import Container from "components/porter/Container";
import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import SearchBar from "components/porter/SearchBar";
import Toggle from "components/porter/Toggle";
import PorterLink from "components/porter/Link";
import Loading from "components/Loading";
import Fieldset from "components/porter/Fieldset";
import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import { useQuery } from "@tanstack/react-query";
import { useAppAnalytics } from "lib/hooks/useAppAnalytics";
import { appRevisionWithSourceValidator } from "./types";
import AppGrid from "./AppGrid";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import { z } from "zod";
import { useDeploymentTarget } from "shared/DeploymentTargetContext";
import DeleteEnvModal from "main/home/cluster-dashboard/preview-environments/v2/DeleteEnvModal";
import { useHistory } from "react-router";

type Props = {};

const Apps: React.FC<Props> = ({}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const { updateAppStep } = useAppAnalytics();
  const { currentDeploymentTarget } = useDeploymentTarget();
  const history = useHistory();

  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<"calendar" | "letter">("calendar");
  const [showDeleteEnvModal, setShowDeleteEnvModal] = useState(false);
  const [envDeleting, setEnvDeleting] = useState(false);

  const { data: apps = [], status } = useQuery(
    [
      "getLatestAppRevisions",
      {
        cluster_id: currentCluster?.id,
        project_id: currentProject?.id,
        deployment_target_id: currentDeploymentTarget?.id,
      },
    ],
    async () => {
      if (
        !currentCluster ||
        !currentProject ||
        currentCluster.id === -1 ||
        currentProject.id === -1 ||
        !currentDeploymentTarget
      ) {
        return;
      }

      const res = await api.getLatestAppRevisions(
        "<token>",
        {
          deployment_target_id: currentDeploymentTarget?.id,
        },
        { cluster_id: currentCluster.id, project_id: currentProject.id }
      );

      const apps = await z
        .object({
          app_revisions: z.array(appRevisionWithSourceValidator),
        })
        .parseAsync(res.data);

      return apps.app_revisions;
    },
    {
      refetchOnWindowFocus: false,
      enabled:
        !!currentCluster && !!currentProject && !!currentDeploymentTarget,
    }
  );

  const { data, status: deploymentTargetStatus } = useQuery(
    [
      "getDeploymentTarget",
      {
        cluster_id: currentCluster?.id,
        project_id: currentProject?.id,
        deployment_target_id: currentDeploymentTarget?.id,
      },
    ],
    async () => {
      if (!currentCluster || !currentProject || !currentDeploymentTarget) {
        return;
      }
      const res = await api.getDeploymentTarget(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          deployment_target_id: currentDeploymentTarget.id,
        }
      );

      const { deployment_target } = await z
        .object({
          deployment_target: z.object({
            cluster_id: z.number(),
            namespace: z.string(),
            preview: z.boolean(),
          }),
        })
        .parseAsync(res.data);

      return deployment_target;
    },
    {
      enabled:
        !!currentCluster &&
        !!currentProject &&
        currentDeploymentTarget?.preview,
    }
  );

  const deletePreviewEnv = useCallback(async () => {
    try {
      if (!currentCluster || !currentProject || !currentDeploymentTarget) {
        return;
      }
      setEnvDeleting(true);

      await api.deleteDeploymentTarget(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          deployment_target_id: currentDeploymentTarget.id,
        }
      );

      history.push("/preview-environments");
    } catch (err) {
    } finally {
      setShowDeleteEnvModal(false);
      setEnvDeleting(false);
    }
  }, [
    currentCluster,
    currentProject,
    currentDeploymentTarget,
    history,
    setShowDeleteEnvModal,
    setEnvDeleting,
  ]);

  const renderContents = () => {
    if (currentCluster?.status === "UPDATING_UNAVAILABLE") {
      return <ClusterProvisioningPlaceholder />;
    }

    if (
      status === "loading" ||
      (currentDeploymentTarget?.preview && deploymentTargetStatus === "loading")
    ) {
      return <Loading offset="-150px" />;
    }

    if (apps.length === 0) {
      return (
        <Fieldset>
          <CentralContainer>
            <Text size={16}>No apps have been deployed yet.</Text>
            <Spacer y={1} />

            <Text color={"helper"}>Get started by deploying your app.</Text>
            <Spacer y={0.5} />
            <PorterLink to="/apps/new/app">
              <Button
                onClick={async () =>
                  updateAppStep({ step: "stack-launch-start" })
                }
                height="35px"
              >
                Deploy app <Spacer inline x={1} />{" "}
                <i className="material-icons" style={{ fontSize: "18px" }}>
                  east
                </i>
              </Button>
            </PorterLink>
          </CentralContainer>
        </Fieldset>
      );
    }

    return (
      <>
        {currentDeploymentTarget?.preview && (
          <DashboardHeader
            image={pull_request}
            title={
              <div
                style={{
                  display: "flex",
                  columnGap: "0.75rem",
                  alignItems: "center",
                }}
              >
                <div>{data?.namespace ?? "Preview Apps"}</div>
                <Badge>Preview</Badge>
              </div>
            }
            description={"Apps deployed to this preview environment"}
            disableLineBreak
            capitalize={false}
          />
        )}
        <Container row spaced>
          <SearchBar
            value={searchValue}
            setValue={(x) => {
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
            setActive={(x) => {
              if (x === "calendar") {
                setSort("calendar");
              } else {
                setSort("letter");
              }
            }}
            inactiveColor={"#ffffff11"}
            activeColor={"transparent"}
          />
          <Spacer inline x={1} />
          <Toggle
            items={[
              { label: <ToggleIcon src={grid} />, value: "grid" },
              { label: <ToggleIcon src={list} />, value: "list" },
            ]}
            active={view}
            setActive={(x) => {
              if (x === "grid") {
                setView("grid");
              } else {
                setView("list");
              }
            }}
            inactiveColor={"#ffffff11"}
            activeColor={"transparent"}
          />
          <Spacer inline x={2} />
          {currentDeploymentTarget?.preview ? (
            <Button
              onClick={async () => {
                setShowDeleteEnvModal(true);
              }}
              height="30px"
              width="160px"
              color="#b91133"
            >
              Delete Environment
            </Button>
          ) : (
            <PorterLink to="/apps/new/app">
              <Button
                onClick={async () =>
                  updateAppStep({ step: "stack-launch-start" })
                }
                height="30px"
                width="160px"
              >
                <I className="material-icons">add</I> New application
              </Button>
            </PorterLink>
          )}
        </Container>
        <Spacer y={1} />
        <AppGrid
          apps={apps}
          sort={sort}
          view={view}
          searchValue={searchValue}
        />
      </>
    );
  };

  return (
    <StyledAppDashboard>
      {!currentDeploymentTarget?.preview && (
        <DashboardHeader
          image={web}
          title="Applications"
          description="Web services, workers, and jobs for this project."
          disableLineBreak
        />
      )}
      {renderContents()}
      <Spacer y={5} />
      {showDeleteEnvModal && (
        <DeleteEnvModal
          closeModal={() => setShowDeleteEnvModal(false)}
          deleteEnv={deletePreviewEnv}
          loading={envDeleting}
        />
      )}
    </StyledAppDashboard>
  );
};

export default Apps;

const ToggleIcon = styled.img`
  height: 12px;
  margin: 0 5px;
  min-width: 12px;
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

const Badge = styled.div`
  border: 1px solid #ca8a04;
  background-color: #fefce8;
  color: #ca8a04;
  padding: 0.15rem 0.3rem;
  text-align: center;
  border-radius: 3px;
  font-size: 12px;
`;
