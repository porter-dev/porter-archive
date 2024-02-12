import React, { useState } from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import { type ClientCloudProvider } from "lib/clusters/types";

import CreateEKSCluster from "./aws/CreateEKSCluster";
import CloudProviderSelect from "./CloudProviderSelect";

const CreateClusterForm: React.FC = () => {
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<
    ClientCloudProvider | undefined
  >(undefined);

  return (
    <CreateClusterFormContainer>
      {match(selectedCloudProvider)
        .with({ name: "AWS" }, () => <CreateEKSCluster />)
        .with({ name: "GCP" }, () => <div>hello</div>)
        .with({ name: "Azure" }, () => <div>hello</div>)
        .otherwise(() => (
          <CloudProviderSelect
            onComplete={(provider: ClientCloudProvider) => {
              setSelectedCloudProvider(provider);
            }}
          />
        ))}
    </CreateClusterFormContainer>
  );
};

export default CreateClusterForm;

const CreateClusterFormContainer = styled.div`
  width: 100%;
  height: 100%;
`;
