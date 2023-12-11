import React, { useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useHistory } from "react-router";
import { z } from "zod";

import Loading from "components/Loading";
import Placeholder from "components/Placeholder";
import Banner from "components/porter/Banner";
import Button from "components/porter/Button";
import Input from "components/porter/Input";
import Link from "components/porter/Link";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import ToggleRow from "components/porter/ToggleRow";

import api from "shared/api";
import { Context } from "shared/Context";

const DopplerIntegrationList: React.FC = (_) => {
  const history = useHistory();
  const [dopplerToggled, setDopplerToggled] = useState<boolean>(false);
  const [dopplerEnabled, setDopplerEnabled] = useState<boolean>(false);
  const [dopplerEnvGroupCreationError, setDopplerEnvGroupCreationError] =
    useState<string>("");
  const [dopplerEnvGroupCreationStatus, setDopplerEnvGroupCreationStatus] =
    useState<string>("");
  const [showServiceTokenModal, setShowServiceTokenModal] =
    useState<boolean>(false);
  const [envGroupName, setEnvGroupName] = useState<string>("");
  const [dopplerServiceToken, setDopplerServiceToken] = useState<string>("");

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
      const res = await api.areExternalEnvGroupProvidersEnabled(
        "<token>",
        {},
        { id: currentProject?.id, cluster_id: currentCluster?.id }
      );
      const externalEnvGroupProviderStatus = await z
        .object({
          enabled: z.boolean(),
          reprovision_required: z.boolean(),
          k8s_upgrade_required: z.boolean(),
        })
        .parseAsync(res.data);

      return externalEnvGroupProviderStatus;
    },
    {
      enabled: !!currentProject && !!currentCluster,
      refetchInterval: 5000,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (externalProviderStatus) {
      setDopplerToggled(externalProviderStatus.enabled);
      setDopplerEnabled(externalProviderStatus.enabled);
    }
  }, [externalProviderStatus]);

  const installDoppler = (): void => {
    if (!currentCluster || !currentProject) {
      return;
    }

    setDopplerToggled(true);

    api
      .enableExternalEnvGroupProviders(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .catch(() => {
        setDopplerToggled(false);
      });
  };

  // Install the CRD for a new Doppler secret
  const addDopplerEnvGroup = (): void => {
    if (!currentCluster || !currentProject) {
      return;
    }
    setDopplerEnvGroupCreationStatus("loading");
    api
      .createEnvironmentGroups(
        "<token>",
        {
          name: envGroupName,
          type: "doppler",
          auth_token: dopplerServiceToken,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then(() => {
        setShowServiceTokenModal(false);
        history.push("/env-groups");
      })
      .catch((err) => {
        let message =
          "Env group creation failed: please try again or contact support@porter.run if the error persists.";

        if (axios.isAxiosError(err)) {
          const parsed = z
            .object({ error: z.string() })
            .safeParse(err.response?.data);
          if (parsed.success) {
            message = `Env group creation failed: ${parsed.data.error}`;
          }
        }
        setDopplerEnvGroupCreationError(message);
        setDopplerEnvGroupCreationStatus("error");
      });
  };

  if (!dopplerEnabled) {
    return (
      <>
        {isExternalProviderStatusLoading ? (
          <Placeholder>
            <Loading message={"Checking status of Doppler integration..."} />
          </Placeholder>
        ) : externalProviderStatus?.k8s_upgrade_required ? (
          <Placeholder>
            Cluster must be upgraded to Kubernetes v1.27 to integrate with
            Doppler.
          </Placeholder>
        ) : externalProviderStatus?.reprovision_required ? (
          <Placeholder>
            To enable integration with Doppler, <Spacer inline x={0.5} />
            <Link to={`/cluster-dashboard`} hasunderline>
              re-provision your cluster
            </Link>
            .
          </Placeholder>
        ) : (
          <>
            <Banner icon="none">
              <ToggleRow
                isToggled={dopplerToggled}
                onToggle={installDoppler}
                disabled={dopplerToggled}
              >
                {dopplerToggled
                  ? "Enabling Doppler integration . . ."
                  : "Enable Doppler integration"}
              </ToggleRow>
            </Banner>
            <Spacer y={1} />
            <Placeholder>
              Enable the Doppler integration to add environment groups from
              Doppler.
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
          isToggled={dopplerToggled}
          onToggle={installDoppler}
          disabled={dopplerToggled}
        >
          {dopplerToggled
            ? dopplerEnabled
              ? "Doppler integration enabled"
              : "Enabling Doppler integration . . ."
            : "Enable Doppler integration"}
        </ToggleRow>
      </Banner>
      <Spacer y={1} />
      <Button
        onClick={() => {
          setShowServiceTokenModal(true);
        }}
      >
        + Add Doppler env group
      </Button>

      {showServiceTokenModal && (
        <Modal
          closeModal={() => {
            setShowServiceTokenModal(false);
            setDopplerEnvGroupCreationError("");
            setDopplerEnvGroupCreationStatus("");
            setEnvGroupName("");
            setDopplerServiceToken("");
          }}
        >
          <Text size={16}>Add a new Doppler service token</Text>
          <Spacer y={1} />
          <Text color="helper">
            Your Doppler secrets will be made available to Porter apps as an
            environment group.
          </Text>
          <Spacer y={1} />
          <Input
            placeholder="ex: my-doppler-env"
            label="Env group name (vanity name for Porter)"
            value={envGroupName}
            setValue={(x) => {
              setEnvGroupName(x);
            }}
            width="100%"
            height="40px"
          />
          <Spacer y={1} />
          <Input
            type="password"
            placeholder="ex: dp.st...abcdef"
            label="Doppler service token"
            value={dopplerServiceToken}
            setValue={(x) => {
              setDopplerServiceToken(x);
            }}
            width="100%"
            height="40px"
          />
          <Spacer y={1} />
          <Button
            onClick={addDopplerEnvGroup}
            disabled={
              envGroupName === "" ||
              dopplerServiceToken === "" ||
              dopplerEnvGroupCreationStatus === "loading"
            }
            status={dopplerEnvGroupCreationStatus}
            errorText={dopplerEnvGroupCreationError}
            width="180px"
          >
            Add Doppler env group
          </Button>
        </Modal>
      )}
    </>
  );
};

export default DopplerIntegrationList;
