import React, { useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import Loading from "components/Loading";
import Placeholder from "components/Placeholder";
import Banner from "components/porter/Banner";
import Button from "components/porter/Button";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import ToggleRow from "components/porter/ToggleRow";

import api from "shared/api";
import { Context } from "shared/Context";

import { AddInfisicalEnvModal } from "./AddInfisicalEnvModal";

const InfisicalIntegrationList: React.FC = (_) => {
  const [infisicalToggled, setInfisicalToggled] = useState<boolean>(false);
  const [infisicalEnabled, setInfisicalEnabled] = useState<boolean>(false);
  const [showServiceTokenModal, setShowServiceTokenModal] =
    useState<boolean>(false);

  const { currentCluster, currentProject } = useContext(Context);

  const {
    data: externalProviderStatus,
    isLoading: isExternalProviderStatusLoading,
  } = useQuery(
    [
      "areExternalEnvGroupProvidersEnabled",
      currentProject?.id,
      currentCluster?.id,
    ],
    async () => {
      if (!currentProject || !currentCluster) {
        return;
      }

      const res = await api.areExternalEnvGroupProvidersEnabled(
        "<token>",
        {},
        { id: currentProject?.id, cluster_id: currentCluster?.id }
      );
      const externalEnvGroupProviderStatus = await z
        .object({
          operators: z.array(
            z.object({
              type: z.enum(["infisical", "external-secrets"]),
              enabled: z.boolean(),
              reprovision_required: z.boolean(),
              k8s_upgrade_required: z.boolean(),
            })
          ),
        })
        .parseAsync(res.data);

      return (
        externalEnvGroupProviderStatus.operators.find(
          (o) => o.type === "infisical"
        ) || {
          enabled: false,
          reprovision_required: true,
          k8s_upgrade_required: false,
        }
      );
    },
    {
      enabled: !!currentProject && !!currentCluster,
      refetchInterval: 5000,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (externalProviderStatus) {
      setInfisicalToggled(externalProviderStatus.enabled);
      setInfisicalEnabled(externalProviderStatus.enabled);
    }
  }, [externalProviderStatus]);

  const installInfisical = async (): Promise<void> => {
    if (!currentCluster || !currentProject) {
      return;
    }

    try {
      setInfisicalToggled(true);

      await api.enableExternalEnvGroupProviders(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );
    } catch (err) {
      setInfisicalToggled(false);
    }
  };

  if (!infisicalEnabled) {
    return (
      <>
        {isExternalProviderStatusLoading ? (
          <Placeholder>
            <Loading message={"Checking status of Infisical integration..."} />
          </Placeholder>
        ) : externalProviderStatus?.k8s_upgrade_required ? (
          <Placeholder>
            Cluster must be upgraded to Kubernetes v1.27 to integrate with
            Infisical.
          </Placeholder>
        ) : externalProviderStatus?.reprovision_required ? (
          <Placeholder>
            To enable integration with Infisical, <Spacer inline x={0.5} />
            <Link
              to={
                currentCluster?.id
                  ? `/infrastructure/${currentCluster.id}`
                  : "/infrastructure"
              }
              hasunderline
            >
              re-provision your cluster
            </Link>
            .
          </Placeholder>
        ) : (
          <>
            <Banner icon="none">
              <ToggleRow
                isToggled={infisicalToggled}
                onToggle={installInfisical}
                disabled={infisicalToggled}
              >
                {infisicalToggled
                  ? "Enabling Infisical integration . . ."
                  : "Enable Infisical integration"}
              </ToggleRow>
            </Banner>
            <Spacer y={1} />
            <Placeholder>
              Enable the Infisical integration to add environment groups from
              Infisical.
            </Placeholder>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <Banner icon="none">
        <ToggleRow
          isToggled={infisicalToggled}
          onToggle={installInfisical}
          disabled={infisicalToggled}
        >
          {infisicalToggled
            ? infisicalEnabled
              ? "Infisical integration enabled"
              : "Enabling Infisical integration . . ."
            : "Enable Infisical integration"}
        </ToggleRow>
      </Banner>
      <Spacer y={1} />
      <Button
        onClick={() => {
          setShowServiceTokenModal(true);
        }}
      >
        + Add Infisical env group
      </Button>

      {showServiceTokenModal && (
        <AddInfisicalEnvModal
          setShowAddInfisicalEnvModal={setShowServiceTokenModal}
        />
      )}
    </>
  );
};

export default InfisicalIntegrationList;
