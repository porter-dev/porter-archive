import { z } from "zod";

import api from "shared/api";

// TODO: refactor this to match "connectTo.." syntax
export const isAWSArnAccessible = async ({
  targetArn,
  externalId,
  projectId,
}: {
  targetArn: string;
  externalId: string;
  projectId: number;
}): Promise<boolean> => {
  await api.createAWSIntegration(
    "<token>",
    {
      aws_target_arn: targetArn,
      aws_external_id: externalId,
    },
    { id: projectId }
  );
  return true;
};

export const connectToAzureAccount = async ({
  subscriptionId,
  clientId,
  tenantId,
  servicePrincipalKey,
  projectId,
}: {
  subscriptionId: string;
  clientId: string;
  tenantId: string;
  servicePrincipalKey: string;
  projectId: number;
}): Promise<string> => {
  const res = await api.createAzureIntegration(
    "<token",
    {
      azure_subscription_id: subscriptionId,
      azure_client_id: clientId,
      azure_tenant_id: tenantId,
      service_principal_key: servicePrincipalKey,
    },
    { id: projectId }
  );
  const parsed = await z
    .object({
      cloud_provider_credentials_id: z.string(),
    })
    .parseAsync(res.data);
  return parsed.cloud_provider_credentials_id;
};

export const connectToGCPAccount = async ({
  projectId,
  serviceAccountKey,
  gcpProjectId,
}: {
  projectId: number;
  serviceAccountKey: string;
  gcpProjectId: string;
}): Promise<string> => {
  const res = await api.createGCPIntegration(
    "<token",
    {
      gcp_key_data: serviceAccountKey,
      gcp_project_id: gcpProjectId,
    },
    { project_id: projectId }
  );

  const parsed = await z
    .object({
      cloud_provider_credentials_id: z.string(),
    })
    .parseAsync(res.data);

  return parsed.cloud_provider_credentials_id;
};
