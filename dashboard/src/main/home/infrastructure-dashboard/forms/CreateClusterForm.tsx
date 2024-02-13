import React, { useContext, useState } from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import { type ClientCloudProvider } from "lib/clusters/types";

import api from "shared/api";
import { Context } from "shared/Context";

import CreateEKSClusterForm from "./aws/CreateEKSClusterForm";
import CloudProviderSelect from "./CloudProviderSelect";

const CreateClusterForm: React.FC = () => {
  const { currentProject } = useContext(Context);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<
    ClientCloudProvider | undefined
  >(undefined);

  return (
    <CreateClusterFormContainer>
      {match(selectedCloudProvider)
        .with({ name: "AWS" }, () => (
          <CreateEKSClusterForm
            goBack={() => {
              setSelectedCloudProvider(undefined);
            }}
          />
        ))
        .with({ name: "GCP" }, () => <div>hello</div>)
        .with({ name: "Azure" }, () => <div>hello</div>)
        .otherwise(() => (
          <CloudProviderSelect
            onComplete={(provider: ClientCloudProvider) => {
              setSelectedCloudProvider(provider);
              if (currentProject?.id) {
                void api.inviteAdmin(
                  "<token>",
                  {},
                  { project_id: currentProject.id }
                );
              }
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
