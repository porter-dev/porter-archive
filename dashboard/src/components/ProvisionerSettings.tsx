import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import api from "shared/api";
import aws from "assets/aws.png";

import { Context } from "shared/Context";

import SelectRow from "components/form-components/SelectRow";
import Heading from "components/form-components/Heading";
import InputRow from "./form-components/InputRow";
import SaveButton from "./SaveButton";

const regionOptions = [
  { value: "us-east-1", label: "US East (N. Virginia) us-east-1" },
  { value: "us-east-2", label: "US East (Ohio) us-east-2" },
  { value: "us-west-1", label: "US West (N. California) us-west-1" },
  { value: "us-west-2", label: "US West (Oregon) us-west-2" },
  { value: "af-south-1", label: "Africa (Cape Town) af-south-1" },
  { value: "ap-east-1", label: "Asia Pacific (Hong Kong) ap-east-1" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai) ap-south-1" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul) ap-northeast-2" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore) ap-southeast-1" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney) ap-southeast-2" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo) ap-northeast-1" },
  { value: "ca-central-1", label: "Canada (Central) ca-central-1" },
  { value: "eu-central-1", label: "Europe (Frankfurt) eu-central-1" },
  { value: "eu-west-1", label: "Europe (Ireland) eu-west-1" },
  { value: "eu-west-2", label: "Europe (London) eu-west-2" },
  { value: "eu-south-1", label: "Europe (Milan) eu-south-1" },
  { value: "eu-west-3", label: "Europe (Paris) eu-west-3" },
  { value: "eu-north-1", label: "Europe (Stockholm) eu-north-1" },
  { value: "me-south-1", label: "Middle East (Bahrain) me-south-1" },
  { value: "sa-east-1", label: "South America (São Paulo) sa-east-1" },
];

const machineTypeOptions = [
  { value: "t3.medium", label: "t3.medium" },
  { value: "t3.xlarge", label: "t3.xlarge" },
  { value: "t3.2xlarge", label: "t3.2xlarge" },
];

type Props = {
  credentialId: string;
  clusterId?: number;
};

const ProvisionerForm: React.FC<Props> = ({
  credentialId,
  clusterId,
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [createStatus, setCreateStatus] = useState("");
  const [clusterName, setClusterName] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [machineType, setMachineType] = useState("t3.medium");
  const [isExpanded, setIsExpanded] = useState(false);
  const [minInstances, setMinInstances] = useState(1);
  const [maxInstances, setMaxInstances] = useState(10);
  const [cidrRange, setCidrRange] = useState("172.0.0.0/16");
  const [isReadOnly, setIsReadOnly] = useState(false);

  const createCluster = async () => {
    var data: any = {
      project_id: currentProject.id,
      cloud_provider: "aws",
      cloud_provider_credentials_id: String(credentialId),
      cluster_settings: {
        cluster_name: clusterName,
        cluster_version: "v1.24.0",
        cidr_range: cidrRange || "172.0.0.0/16",
        region: awsRegion,
        node_groups: [
          {
            instance_type: "t3.medium",
            min_instances: 1,
            max_instances: 5,
            node_group_type: "SYSTEM"
          },
          {
            instance_type: "t3.large",
            min_instances: 1,
            max_instances: 5,
            node_group_type: "MONITORING"
          },
          {
            instance_type: machineType,
            min_instances: minInstances || 1,
            max_instances: maxInstances || 10,
            node_group_type: "APPLICATION"
          }
        ]
      }
    };

    if (clusterId) {
      data["cluster_id"] = clusterId;
    }

    try {
      await api.provisionCluster(
        "<token>",
        data,
        { project_id: currentProject.id }
      );
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    setIsReadOnly(
      clusterId && (
        currentCluster.status === "UPDATING" || 
        currentCluster.status === "UPDATING_UNAVAILABLE"
      )
    );
  }, []);

  return (
    <>
      <StyledForm>
        <Heading isAtTop>EKS configuration</Heading>
        <InputRow
          width="350px"
          isRequired
          disabled={isReadOnly}
          type="string"
          value={clusterName}
          setValue={(x: string) => setClusterName(x)}
          label="🏷️ Cluster name"
          placeholder="ex: total-perspective-vortex"
        />
        <SelectRow
          options={regionOptions}
          width="350px"
          disabled={isReadOnly}
          value={awsRegion}
          scrollBuffer={true}
          dropdownMaxHeight="240px"
          setActiveValue={setAwsRegion}
          label="📍 AWS Region"
        />
        <SelectRow
          options={machineTypeOptions}
          width="350px"
          disabled={isReadOnly}
          value={machineType}
          scrollBuffer={true}
          dropdownMaxHeight="240px"
          setActiveValue={setMachineType}
          label="⚙️ Machine type"
        />

        <Heading>
          <ExpandHeader
            onClick={() => setIsExpanded(!isExpanded)}
            isExpanded={isExpanded}
          >
            <i className="material-icons">arrow_drop_down</i>
            Advanced settings
          </ExpandHeader>
        </Heading>
        {
          isExpanded && (
            <>
              <InputRow
                width="350px"
                type="number"
                disabled={isReadOnly}
                value={minInstances}
                setValue={(x: number) => setMinInstances(x)}
                label="Minimum number of application EC2 instances"
                placeholder="ex: 1"
              />
              <InputRow
                width="350px"
                type="number"
                disabled={isReadOnly}
                value={maxInstances}
                setValue={(x: number) => setMaxInstances(x)}
                label="Minimum number of application EC2 instances"
                placeholder="ex: 1"
              />
              <InputRow
                width="350px"
                type="string"
                disabled={isReadOnly}
                value={cidrRange}
                setValue={(x: string) => setCidrRange(x)}
                label="VPC CIDR range"
                placeholder="ex: 172.0.0.0/16"
              />
            </>
          )
        }
      </StyledForm>
      <SaveButton
        disabled={(!clusterName && true) || isReadOnly}
        onClick={createCluster}
        clearPosition
        text="Provision"
        statusPosition="right"
        status={isReadOnly && "Provisioning is still in progress"}
      />
    </>
  );
};

export default ProvisionerForm;

const ExpandHeader = styled.div<{ isExpanded: boolean }>`
  display: flex;
  align-items: center;
  cursor: pointer;
  > i {
    margin-right: 7px;
    margin-left: -7px;
    transform: ${(props) => props.isExpanded ? "rotate(0deg)" : "rotate(-90deg)"};
  }
`;

const StyledForm = styled.div`
  position: relative;
  padding: 30px 30px 25px;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  font-size: 13px;
  margin-bottom: 30px;
`;