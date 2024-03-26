import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import pluralize from "pluralize";
import styled from "styled-components";
import { z } from "zod";

import Loading from "components/Loading";
import Button from "components/porter/Button";
import Error from "components/porter/Error";
import Icon from "components/porter/Icon";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import SelectableAppList from "main/home/app-dashboard/apps/SelectableAppList";
import {
  appRevisionWithSourceValidator,
  type AppRevisionWithSource,
} from "main/home/app-dashboard/apps/types";
import EnvGroupRow from "main/home/app-dashboard/validate-apply/app-settings/EnvGroupRow";
import { useDatastoreMethods } from "lib/hooks/useDatabaseMethods";
import { useEnvGroupList } from "lib/hooks/useEnvGroups";
import { useIntercom } from "lib/hooks/useIntercom";

import api from "shared/api";
import connect from "assets/connect.svg";

import { useDatastoreContext } from "../DatabaseContextProvider";

type Props = {
  closeModal: () => void;
};

const ConnectAppsModal: React.FC<Props> = ({ closeModal }) => {
  const { datastore, projectId } = useDatastoreContext();
  const { attachDatastoreToAppInstances } = useDatastoreMethods();
  const { envGroups, isLoading } = useEnvGroupList({
    clusterId: datastore.connected_cluster_ids.length
      ? datastore.connected_cluster_ids[0]
      : undefined,
  });
  const matchingEnvGroup = useMemo(() => {
    return envGroups.find((eg) => eg.name === datastore.name);
  }, [envGroups, datastore]);
  const [clusterConnectedApps, setClusterConnectedApps] = useState<
    AppRevisionWithSource[]
  >([]);

  useEffect(() => {
    const fetchClusterConnectedApps = async (): Promise<void> => {
      try {
        const res = await Promise.all(
          datastore.connected_cluster_ids.map(async (clusterId) => {
            return await api.getLatestAppRevisions(
              "<token>",
              {
                deployment_target_id: undefined,
                ignore_preview_apps: true,
              },
              { cluster_id: clusterId, project_id: projectId }
            );
          })
        );
        const apps = await Promise.all(
          res.map(async (r) => {
            const parsed = await z
              .object({
                app_revisions: z.array(appRevisionWithSourceValidator),
              })
              .parseAsync(r.data);
            return parsed.app_revisions;
          })
        );
        setClusterConnectedApps(apps.flat());
      } catch (err) {
        // TODO: handle error
      }
    };
    void fetchClusterConnectedApps();
  }, [datastore.connected_cluster_ids, projectId]);

  const [selectedAppInstances, setSelectedAppInstances] = useState<
    AppRevisionWithSource[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string>("");
  const { showIntercomWithMessage } = useIntercom();

  const append = useCallback(
    (appInstance: AppRevisionWithSource): void => {
      if (
        !selectedAppInstances
          .map((s) => s.app_revision.app_instance_id)
          .includes(appInstance.app_revision.app_instance_id)
      ) {
        setSelectedAppInstances([...selectedAppInstances, appInstance]);
      }
    },
    [selectedAppInstances]
  );
  const remove = useCallback(
    (appInstance: AppRevisionWithSource): void => {
      setSelectedAppInstances(
        selectedAppInstances.filter(
          (a) => a.app_revision.app_instance_id !== appInstance.app_revision.id
        )
      );
    },
    [selectedAppInstances]
  );

  const submit = useCallback(async () => {
    try {
      setIsSubmitting(true);
      await attachDatastoreToAppInstances({
        name: datastore.name,
        appInstanceIds: selectedAppInstances.map(
          (a) => a.app_revision.app_instance_id
        ),
      });
      closeModal();
    } catch (err) {
      let message = "Please contact support.";
      if (axios.isAxiosError(err)) {
        const parsed = z
          .object({ error: z.string() })
          .safeParse(err.response?.data);
        if (parsed.success) {
          message = `${parsed.data.error}`;
        }
      }
      setSubmitErrorMessage(message);
      showIntercomWithMessage({
        message: "I am having trouble connecting apps to my datastore.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedAppInstances]);

  const submitButtonStatus = useMemo(() => {
    if (isSubmitting) {
      return "loading";
    }

    if (submitErrorMessage) {
      return <Error message={`Connection failed: ${submitErrorMessage}`} />;
    }

    return "";
  }, [isSubmitting, submitErrorMessage]);

  if (isLoading) {
    return (
      <Modal closeModal={closeModal}>
        <Text size={16}>Inject credentials into apps</Text>
        <Spacer y={0.5} />
        <Loading />
      </Modal>
    );
  }
  if (datastore.connected_cluster_ids.length === 0) {
    return (
      <Modal closeModal={closeModal}>
        <Text size={16}>Inject credentials into apps</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          No clusters are connected to this datastore. Please connect a cluster
          first.
        </Text>
      </Modal>
    );
  }

  if (!matchingEnvGroup) {
    return (
      <Modal closeModal={closeModal}>
        <Text size={16}>Inject credentials into apps</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          The env group for this datastore has not yet been created. Please add
          credentials to your application environment variables manually.
        </Text>
      </Modal>
    );
  }

  return (
    <Modal closeModal={closeModal}>
      <InnerModalContents>
        <Text size={16}>Inject credentials into apps</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          The following env group contains credentials for your datastore:
        </Text>
        <Spacer y={0.5} />
        <EnvGroupRow
          onRemove={() => ({})}
          envGroup={matchingEnvGroup}
          canDelete={false}
        />
        <Spacer y={1} />
        <Text size={16}>Select apps</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          Select the apps you want to link this env group to.
        </Text>
        <Spacer y={0.5} />
        {clusterConnectedApps.length === 0 && (
          <Text color="warner">
            No apps are available. Please create an app first.
          </Text>
        )}
        {clusterConnectedApps.length !== 0 && (
          <>
            <SelectableAppList
              appListItems={clusterConnectedApps.map((a) => ({
                app: a,
                key: a.source.name,
                onSelect: () => {
                  append(a);
                },
                onDeselect: () => {
                  remove(a);
                },
                isSelected: selectedAppInstances
                  .map((s) => s.app_revision.app_instance_id)
                  .includes(a.app_revision.app_instance_id),
              }))}
            />
            <Spacer y={1} />
            <Button
              disabled={selectedAppInstances.length === 0 || isSubmitting}
              onClick={submit}
              status={submitButtonStatus}
            >
              <Icon src={connect} height={"13px"} />
              <Spacer inline x={0.5} />
              {`Inject credentials ${
                selectedAppInstances.length
                  ? `into ${selectedAppInstances.length} ${pluralize(
                      "app",
                      selectedAppInstances.length
                    )}`
                  : ""
              }`}
            </Button>
          </>
        )}
      </InnerModalContents>
    </Modal>
  );
};

export default ConnectAppsModal;

const InnerModalContents = styled.div`
  overflow-y: auto;
  max-height: 80vh;
`;
