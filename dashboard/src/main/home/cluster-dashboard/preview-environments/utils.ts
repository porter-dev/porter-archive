import api from "shared/api";

interface ValidatePorterYAMLProps {
  projectID: number;
  clusterID: number;
  environmentID: number;
  branch?: string;
}

export const validatePorterYAML = ({
  projectID,
  clusterID,
  environmentID,
  branch,
}: ValidatePorterYAMLProps) => {
  return api.validatePorterYAML(
    "<token>",
    {
      ...(branch ? { branch } : {}),
    },
    {
      project_id: projectID,
      cluster_id: clusterID,
      environment_id: environmentID,
    }
  );
};

interface GetPRDeploymentListProps {
  projectID: number;
  clusterID: number;
  environmentID: number;
}

export const getPRDeploymentList = ({
  clusterID,
  projectID,
  environmentID,
}: GetPRDeploymentListProps) => {
  return api.getPRDeploymentList(
    "<token>",
    {
      environment_id: environmentID,
    },
    {
      project_id: projectID,
      cluster_id: clusterID,
    }
  );
};
