import api from "shared/api";

export const isAWSArnAccessible = async ({
  targetArn,
  externalId,
  projectId,
}: {
  targetArn: string;
  externalId: string;
  projectId: number;
}): Promise<boolean> => {
  try {
    await api.createAWSIntegration(
      "<token>",
      {
        aws_target_arn: targetArn,
        aws_external_id: externalId,
      },
      { id: projectId }
    );
    return true;
  } catch (err) {
    return false;
  }
};
