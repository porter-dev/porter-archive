import api from "shared/api";

export const useClusterAnalytics = (): {
  reportToAnalytics: ({
    step,
    projectId,
    awsAccountId,
    cloudFormationUrl,
    errorMessage,
    loginUrl,
    externalId,
    provider,
    cloudProviderCredentialIdentifier,
    region,
    clusterName,
  }: {
    step: string;
    projectId: number;
    awsAccountId?: string;
    cloudFormationUrl?: string;
    errorMessage?: string;
    loginUrl?: string;
    externalId?: string;
    provider?: string;
    cloudProviderCredentialIdentifier?: string;
    region?: string;
    clusterName?: string;
  }) => Promise<void>;
} => {
  const reportToAnalytics = async ({
    step,
    projectId,
    awsAccountId = "",
    cloudFormationUrl = "",
    errorMessage = "",
    loginUrl = "",
    externalId = "",
    region = "",
    provider = "",
    cloudProviderCredentialIdentifier = "",
    clusterName = "",
  }: {
    step: string;
    projectId: number;
    awsAccountId?: string;
    cloudFormationUrl?: string;
    errorMessage?: string;
    loginUrl?: string;
    externalId?: string;
    region?: string;
    provider?: string;
    cloudProviderCredentialIdentifier?: string;
    clusterName?: string;
  }): Promise<void> => {
    await api
      .updateOnboardingStep(
        "<token>",
        {
          step,
          account_id: awsAccountId,
          cloudformation_url: cloudFormationUrl,
          error_message: errorMessage,
          login_url: loginUrl,
          external_id: externalId,
          region,
          provider,
          cloud_provider_credential_identifier:
            cloudProviderCredentialIdentifier,
          cluster_name: clusterName,
        },
        {
          project_id: projectId,
        }
      )
      .catch(() => ({})); // do not care about error here
  };

  return {
    reportToAnalytics,
  };
};
