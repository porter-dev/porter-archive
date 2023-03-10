import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import api from "shared/api";
import loading from "assets/loading.gif";

import { Context } from "shared/Context";
import ExpandableSection from "components/ExpandableSection";
import { 
  Contract, 
  Cluster, 
  EKS, 
  NodeGroupType, 
  EnumKubernetesKind, 
  EnumCloudProvider 
} from "@porter-dev/api-contracts";

type Props = {};

const ClusterRevisionSelector: React.FC<Props> = ({}) => {
  const { currentProject } = useContext(Context);
  const [versions, setVersions] = useState<Contract[]>(null);

  useEffect(() => {
    api.getContracts(
      "<token>",
      {},
      { project_id: currentProject.id },
    )
      .then(({ data }) => {
        console.log(data);
      })
      .catch((err) => {
        console.error(err);
      });
   /*
    setVersions([
      new Contract({
        cluster: new Cluster({
          projectId: currentProject.id,
          kind: EnumKubernetesKind.EKS,
          cloudProvider: EnumCloudProvider.AWS,
          cloudProviderCredentialsId: "0",
          kindValues: {
            case: "eksKind",
            value: new EKS({
              clusterName: "my-great-eks-cluster",
              clusterVersion: "v1.24.0",
              cidrRange: cidrRange || "172.0.0.0/16",
              region: awsRegion,
              nodeGroups: [
                new EKSNodeGroup({
                  instanceType: "t3.medium",
                  minInstances: 1,
                  maxInstances: 5,
                  nodeGroupType: NodeGroupType.SYSTEM,
                  isStateful: false,
                }),
                new EKSNodeGroup({
                  instanceType: "t3.large",
                  minInstances: 1,
                  maxInstances: 5,
                  nodeGroupType: NodeGroupType.MONITORING,
                  isStateful: false,
                }),
                new EKSNodeGroup({
                  instanceType: machineType,
                  minInstances: minInstances || 1,
                  maxInstances: maxInstances || 10,
                  nodeGroupType: NodeGroupType.APPLICATION,
                  isStateful: false,
                })
              ]
            })
          },
        })
      }),
    ])
    */
  }, []);

  return (
    <StyledClusterRevisionSelector>
      <ExpandableSection
        isInitiallyExpanded={false}
        Header={(
          <>
            <Label>Current version -</Label>
            No. 1
          </>
        )}
        ExpandedSection={(
          <RevisionList>

          </RevisionList>
        )}
      />
    </StyledClusterRevisionSelector>
  );
};

export default ClusterRevisionSelector;

const Label = styled.div`
  color: #ffffff66;
  margin-right: 5px;
`;

const RevisionList = styled.div`
  height: 150px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
`;

const StyledClusterRevisionSelector = styled.div`
  margin-bottom: 22px;
`;