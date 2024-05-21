import React, { useContext, useState } from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Loading from "components/Loading";
import RequestToEnable from "components/porter/RequestToEnable";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import { type ClientCloudProvider } from "lib/clusters/types";
import { useClusterList } from "lib/hooks/useCluster";

import api from "shared/api";
import { Context } from "shared/Context";
import infraGrad from "assets/infra-grad.svg";

import ClusterFormContextProvider from "../ClusterFormContextProvider";
import CreateEKSClusterForm from "./aws/CreateEKSClusterForm";
import CreateAKSClusterForm from "./azure/CreateAKSClusterForm";
import CloudProviderSelect from "./CloudProviderSelect";
import CreateGKEClusterForm from "./gcp/CreateGKEClusterForm";

const CreateClusterForm: React.FC = () => {
  const { currentProject } = useContext(Context);
  const { clusters } = useClusterList();
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<
    ClientCloudProvider | undefined
  >(undefined);

  if (!currentProject || currentProject.id === -1) {
    return <Loading />;
  }
  if (!currentProject?.multi_cluster && clusters.length > 0) {
    return (
      <Wrapper>
        <DashboardHeader
          image={infraGrad}
          title="Infrastructure"
          description="Clusters for running applications on this project."
          disableLineBreak
        />
        <RequestToEnable
          title={"Multi-cluster is not enabled for this project"}
          subtitle={
            "Reach out to the Porter team to enable multi-cluster on your project."
          }
          intercomText={"I would like to enable multi-cluster for my project."}
        />
      </Wrapper>
    );
  }

  return (
    <ClusterFormContextProvider
      projectId={currentProject?.id}
      isAdvancedSettingsEnabled={currentProject?.advanced_infra_enabled}
      isMultiClusterEnabled={currentProject?.multi_cluster}
      isCreatingCluster
    >
      <CreateClusterFormContainer>
        {match(selectedCloudProvider)
          .with({ name: "AWS" }, () => (
            <CreateEKSClusterForm
              goBack={() => {
                setSelectedCloudProvider(undefined);
              }}
              projectId={currentProject.id}
              projectName={currentProject.name}
            />
          ))
          .with({ name: "GCP" }, () => (
            <CreateGKEClusterForm
              goBack={() => {
                setSelectedCloudProvider(undefined);
              }}
              projectId={currentProject.id}
              projectName={currentProject.name}
            />
          ))
          .with({ name: "Azure" }, () => (
            <CreateAKSClusterForm
              goBack={() => {
                setSelectedCloudProvider(undefined);
              }}
              projectId={currentProject.id}
              projectName={currentProject.name}
            />
          ))
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
    </ClusterFormContextProvider>
  );
};

export default CreateClusterForm;

const Wrapper = styled.div`
  width: 100%;
`;

const CreateClusterFormContainer = styled.div`
  width: 100%;
`;

export const Img = styled.img`
  height: 18px;
  margin-right: 15px;
`;

export const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 13px;
  height: 35px;
  padding: 5px 13px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
    margin-left: -2px;
  }
`;
