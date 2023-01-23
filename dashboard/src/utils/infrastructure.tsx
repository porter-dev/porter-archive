interface OverrideInfraTabEnabledProps {
  projectID: number;
}

export const overrideInfraTabEnabled = ({
  projectID,
}: OverrideInfraTabEnabledProps) => {
  const ALLOWED_PROJECTS = [
    {
      name: "thriva",
      id: 6638,
    },
  ];

  return ALLOWED_PROJECTS.some((project) => project.id === projectID);
};
