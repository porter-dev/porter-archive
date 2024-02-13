import React from "react";

type Props = {
  goBack: () => void;
  proceed: ({
    cloudProviderCredentialIdentifier,
  }: {
    cloudProviderCredentialIdentifier: string;
  }) => void;
  projectId: number;
};
const GrantGCPPermissions: React.FC<Props> = ({
  goBack,
  proceed,
  projectId,
}) => {
  // Component logic goes here

  return <div>{/* Component JSX goes here */}</div>;
};

export default GrantGCPPermissions;
