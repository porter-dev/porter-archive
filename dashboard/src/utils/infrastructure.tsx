interface OverrideInfraTabEnabledProps {
  projectID: number;
}

export const overrideInfraTabEnabled = ({
  projectID,
}: OverrideInfraTabEnabledProps) => {
  const ALLOWED_PROJECTS = [6638];

  return ALLOWED_PROJECTS.some((id) => id === projectID);
};
