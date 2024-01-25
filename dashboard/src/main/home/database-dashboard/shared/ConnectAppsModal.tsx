import React, { useCallback, useMemo, useState } from "react";
import axios from "axios";
import pluralize from "pluralize";
import { z } from "zod";

import Button from "components/porter/Button";
import Error from "components/porter/Error";
import Icon from "components/porter/Icon";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import SelectableAppList from "main/home/app-dashboard/apps/SelectableAppList";
import { type AppRevisionWithSource } from "main/home/app-dashboard/apps/types";
import { useIntercom } from "lib/hooks/useIntercom";

import connect from "assets/connect.svg";

type Props = {
  closeModal: () => void;
  apps: AppRevisionWithSource[];
  onSubmit: (appInstanceIds: string[]) => Promise<void>;
};

const ConnectAppsModal: React.FC<Props> = ({ closeModal, apps, onSubmit }) => {
  const [selectedAppInstanceIds, setSelectedAppInstanceIds] = useState<
    string[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string>("");
  const { showIntercomWithMessage } = useIntercom();

  const append = useCallback(
    (appInstanceId: string): void => {
      if (!selectedAppInstanceIds.includes(appInstanceId)) {
        setSelectedAppInstanceIds([...selectedAppInstanceIds, appInstanceId]);
      }
    },
    [selectedAppInstanceIds]
  );
  const remove = useCallback(
    (appInstanceId: string): void => {
      setSelectedAppInstanceIds(
        selectedAppInstanceIds.filter((id) => id !== appInstanceId)
      );
    },
    [selectedAppInstanceIds]
  );
  const isSelected = useCallback(
    (appInstanceId: string): boolean => {
      return selectedAppInstanceIds.includes(appInstanceId);
    },
    [selectedAppInstanceIds]
  );
  const submit = useCallback(async () => {
    try {
      setIsSubmitting(true);
      await onSubmit(selectedAppInstanceIds);
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
  }, [onSubmit, selectedAppInstanceIds]);

  const submitButtonStatus = useMemo(() => {
    if (isSubmitting) {
      return "loading";
    }

    if (submitErrorMessage) {
      return <Error message={`Connection failed: ${submitErrorMessage}`} />;
    }

    return "";
  }, [isSubmitting, submitErrorMessage]);

  return (
    <Modal closeModal={closeModal}>
      <Text size={16}>Select apps</Text>
      <Spacer y={0.5} />
      <SelectableAppList
        appListItems={apps.map((a) => ({
          app: a,
          key: a.source.name,
          onSelect: () => {
            append(a.app_revision.app_instance_id);
          },
          onDeselect: () => {
            remove(a.app_revision.app_instance_id);
          },
          isSelected: isSelected(a.app_revision.app_instance_id),
        }))}
      />
      <Spacer y={1} />
      <Text color="helper">
        Click the button below to confirm the above selections. Newly connected
        apps may take a few seconds to appear on the dashboard.
      </Text>
      <Spacer y={0.5} />
      <Button
        disabled={selectedAppInstanceIds.length === 0 || isSubmitting}
        onClick={submit}
        status={submitButtonStatus}
      >
        <Icon src={connect} height={"13px"} />
        <Spacer inline x={0.5} />
        {`Connect ${
          selectedAppInstanceIds.length
            ? `${selectedAppInstanceIds.length} ${pluralize(
                "app",
                selectedAppInstanceIds.length
              )}`
            : ""
        }`}
      </Button>
    </Modal>
  );
};

export default ConnectAppsModal;
