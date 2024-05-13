import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import Link from "components/porter/Link";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useAuthWindow } from "lib/hooks/useAuthWindow";
import { useNeon } from "lib/hooks/useNeon";
import { useUpstash } from "lib/hooks/useUpstash";

import { useDatastoreFormContext } from "../DatastoreFormContextProvider";

type Props = {
  onClose: () => void;
};

export const NeonIntegrationModal: React.FC<Props> = ({ onClose }) => {
  const { projectId } = useDatastoreFormContext();
  const { getNeonIntegrations } = useNeon();
  const { openAuthWindow } = useAuthWindow({
    authUrl: `/api/projects/${projectId}/oauth/neon`,
  });

  const neonIntegrationsResp = useQuery(
    ["getNeonIntegrations", projectId],
    async () => {
      const integrations = await getNeonIntegrations({
        projectId,
      });
      return integrations;
    },
    {
      enabled: !!projectId,
      refetchInterval: 1000,
    }
  );
  useEffect(() => {
    if (
      neonIntegrationsResp.isSuccess &&
      neonIntegrationsResp.data.length > 0
    ) {
      onClose();
    }
  }, [neonIntegrationsResp]);

  return (
    <Modal closeModal={onClose} width={"800px"}>
      <Text size={16}>Integrate Neon</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        To continue, you must authenticate with Neon.{" "}
        <Link target="_blank" onClick={openAuthWindow} hasunderline>
          Authorize Porter to create Neon datastores on your behalf
        </Link>
      </Text>
    </Modal>
  );
};

export const UpstashIntegrationModal: React.FC<Props> = ({ onClose }) => {
  const { projectId } = useDatastoreFormContext();
  const { getUpstashIntegrations } = useUpstash();
  const { openAuthWindow } = useAuthWindow({
    authUrl: `/api/projects/${projectId}/oauth/upstash`,
  });

  const upstashIntegrationsResp = useQuery(
    ["getUpstashIntegrations", projectId],
    async () => {
      const integrations = await getUpstashIntegrations({
        projectId,
      });
      return integrations;
    },
    {
      enabled: !!projectId,
      refetchInterval: 1000,
    }
  );
  useEffect(() => {
    if (
      upstashIntegrationsResp.isSuccess &&
      upstashIntegrationsResp.data.length > 0
    ) {
      onClose();
    }
  }, [upstashIntegrationsResp]);

  return (
    <Modal closeModal={onClose} width={"800px"}>
      <Text size={16}>Integrate Upstash</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        To continue, you must authenticate with Upstash.{" "}
        <Link target="_blank" onClick={openAuthWindow} hasunderline>
          Authorize Porter to create Upstash datastores on your behalf
        </Link>
      </Text>
    </Modal>
  );
};
