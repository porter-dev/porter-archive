import React, { useCallback, useContext, useMemo, useState } from "react";
import { Addon } from "@porter-dev/api-contracts/src/porter/v1/addons_pb";
import { useQueries } from "@tanstack/react-query";
import { useHistory } from "react-router";
import styled from "styled-components";
import { z } from "zod";

import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import Loading from "components/Loading";
import Banner from "components/porter/Banner";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import Image from "components/porter/Image";
import PorterLink from "components/porter/Link";
import Link from "components/porter/Link";
import Modal from "components/porter/Modal";
import SearchBar from "components/porter/SearchBar";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Toggle from "components/porter/Toggle";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import DeleteEnvModal from "main/home/cluster-dashboard/preview-environments/v2/DeleteEnvModal";
import BillingModal from "main/home/modals/BillingModal";
import { clientAddonFromProto, type ClientAddon } from "lib/addons";
import { useAppAnalytics } from "lib/hooks/useAppAnalytics";
import { checkIfProjectHasPayment } from "lib/hooks/useStripe";

import api from "shared/api";
import { Context } from "shared/Context";
import { useDeploymentTarget } from "shared/DeploymentTargetContext";
import applicationGrad from "assets/application-grad.svg";
import calendar from "assets/calendar-number.svg";
import gift from "assets/gift.svg";
import grid from "assets/grid.png";
import list from "assets/list.png";
import pull_request from "assets/pull_request_icon.svg";
import letter from "assets/vector.svg";

import AppGrid from "./AppGrid";
import { appRevisionWithSourceValidator } from "./types";

export type ClientAddonWithEnv = {
  addon: ClientAddon;
  variables: Record<string, string>;
  secrets: Record<string, string>;
};

const Apps: React.FC = () => {
  const { currentProject, currentCluster } = useContext(Context);
  const { updateAppStep } = useAppAnalytics();
  const { currentDeploymentTarget } = useDeploymentTarget();
  const { hasPaymentEnabled } = checkIfProjectHasPayment();
  const history = useHistory();

  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<"calendar" | "letter">("calendar");
  const [showDeleteEnvModal, setShowDeleteEnvModal] = useState(false);
  const [envDeleting, setEnvDeleting] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);

  const [{ data: apps = [], status }, { data: addons = [] }] = useQueries({
    queries: [
      {
        queryKey: [
          "getLatestAppRevisions",
          {
            cluster_id: currentCluster?.id,
            project_id: currentProject?.id,
            deployment_target_id: currentDeploymentTarget?.id,
          },
        ],
        queryFn: async () => {
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
              deployment_target_id:
                currentProject.managed_deployment_targets_enabled &&
                !currentDeploymentTarget.is_preview
                  ? undefined
                  : currentDeploymentTarget.id,
              ignore_preview_apps: !currentDeploymentTarget.is_preview,
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
        enabled:
          !!currentCluster && !!currentProject && !!currentDeploymentTarget,
        refetchInterval: 5000,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: [
          "listLatestAddons",
          {
            cluster_id: currentCluster?.id,
            project_id: currentProject?.id,
            deployment_target_id: currentDeploymentTarget?.id,
          },
        ],
        queryFn: async () => {
          if (
            !currentCluster ||
            !currentProject ||
            currentCluster.id === -1 ||
            currentProject.id === -1 ||
            !currentDeploymentTarget
          ) {
            return;
          }

          const res = await api.listLatestAddons(
            "<token>",
            {
              deployment_target_id: currentDeploymentTarget.id,
            },
            { clusterId: currentCluster.id, projectId: currentProject.id }
          );

          const parsed = await z
            .object({
              base64_addons: z.array(z.string()),
            })
            .parseAsync(res.data);

          return parsed.base64_addons;
        },
        enabled:
          !!currentCluster &&
          !!currentProject &&
          !!currentDeploymentTarget &&
          currentDeploymentTarget.is_preview,
        refetchOnWindowFocus: false,
      },
    ],
  });

  const clientAddons: ClientAddon[] = useMemo(() => {
    return addons.map((a) => {
      const proto = Addon.fromJsonString(atob(a), {
        ignoreUnknownFields: true,
      });

      return clientAddonFromProto({
        addon: proto,
      });
    });
  }, [addons]);

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

  const renderContents = (): JSX.Element => {
    if (currentCluster?.status === "UPDATING_UNAVAILABLE") {
      return <ClusterProvisioningPlaceholder />;
    }

    if (
      status === "loading" ||
      (currentDeploymentTarget?.is_preview && currentDeploymentTarget.id === "")
    ) {
      return <Loading offset="-150px" />;
    }

    if (apps.length === 0) {
      if (currentCluster?.status === "FAILED") {
        return <ClusterProvisioningPlaceholder />;
      }

      return (
        <>
          {currentProject?.sandbox_enabled && (
            <>
              <Banner icon={<Image src={gift} />}>
                Link a payment method to receive $5 of free Porter credits.
              </Banner>
              <Spacer y={1} />
            </>
          )}
          <DashboardPlaceholder>
            <Text size={16}>No applications have been created yet</Text>
            <Spacer y={0.5} />
            <Text color={"helper"}>
              Get started by creating an application.
            </Text>
            <Spacer y={1} />
            {currentProject?.billing_enabled && !hasPaymentEnabled ? (
              <Button
                alt
                onClick={() => {
                  setShowBillingModal(true);
                }}
                height="35px"
              >
                Create a new application
                <Spacer inline x={1} />{" "}
                <i className="material-icons" style={{ fontSize: "18px" }}>
                  east
                </i>
              </Button>
            ) : (
              <PorterLink to="/apps/new/app">
                <Button
                  alt
                  onClick={async () => {
                    await updateAppStep({ step: "stack-launch-start" });
                  }}
                  height="35px"
                >
                  Create a new application
                  <Spacer inline x={1} />{" "}
                  <i className="material-icons" style={{ fontSize: "18px" }}>
                    east
                  </i>
                </Button>
              </PorterLink>
            )}
            {showBillingModal && (
              <BillingModal
                back={() => {
                  setShowBillingModal(false);
                }}
                onCreate={() => {
                  history.push("/apps/new/app");
                }}
              />
            )}
          </DashboardPlaceholder>
        </>
      );
    }

    return (
      <>
        {currentDeploymentTarget?.is_preview && (
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
                <div>
                  {currentDeploymentTarget?.namespace ?? "Preview Apps"}
                </div>
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
          />
          <Spacer inline x={2} />
          {currentDeploymentTarget?.is_preview ? (
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
                onClick={async () => {
                  await updateAppStep({ step: "stack-launch-start" });
                }}
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
          addons={clientAddons}
          sort={sort}
          view={view}
          searchValue={searchValue}
        />
      </>
    );
  };

  return (
    <StyledAppDashboard>
      {!currentDeploymentTarget?.is_preview && (
        <DashboardHeader
          image={applicationGrad}
          title="Applications"
          description="Web services, workers, and jobs for this project."
          disableLineBreak
        />
      )}
      {renderContents()}
      <Spacer y={5} />
      {showDeleteEnvModal && (
        <DeleteEnvModal
          closeModal={() => {
            setShowDeleteEnvModal(false);
          }}
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

const Badge = styled.div`
  border: 1px solid #ca8a04;
  background-color: #fefce8;
  color: #ca8a04;
  padding: 0.15rem 0.3rem;
  text-align: center;
  border-radius: 3px;
  font-size: 12px;
`;
