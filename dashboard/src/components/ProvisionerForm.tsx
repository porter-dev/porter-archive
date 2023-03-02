import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import api from "shared/api";
import aws from "assets/aws.png";

import { Context } from "shared/Context";

import SelectRow from "components/form-components/SelectRow";
import Heading from "components/form-components/Heading";
import Helper from "./form-components/Helper";
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
  goBack: () => void;
  credentialId: any;
};

const ProvisionerForm: React.FC<Props> = ({
  goBack,
  credentialId,
}) => {
  const { currentProject } = useContext(Context);
  const [createStatus, setCreateStatus] = useState("");
  const [clusterName, setClusterName] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [machineType, setMachineType] = useState("t3.medium")

  const createCluster = async () => {
    try {
      await api.provisionCluster(
        "<token>",
        {
          project_id: currentProject.id,
          cloud_provider: "aws",
          cloud_provider_credentials_id: credentialId,
          cluster_settings: {
            cluster_name: clusterName,
            cluster_version: "v1.24.0",
            cidr_range: "172.0.0.0/16",
            region: awsRegion,
            node_groups: [
              {
                instance_type: "t3.medium",
                min_instances: 1,
                max_instances: 5,
                node_group_type: 1
              },
              {
                instance_type: machineType,
                min_instances: 1,
                max_instances: 10,
                node_group_type: 3
              }
            ]
          }
        },
        { project_id: currentProject.id }
      );
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <>
      <Heading isAtTop>
        <BackButton width="155px" onClick={goBack}>
          <i className="material-icons">first_page</i>
          Set credentials
        </BackButton>
        <Spacer />
        <Img src={aws} />
        Configure settings
      </Heading>
      <Helper>
        Configure settings for your new cluster. 
      </Helper>
      <StyledForm>
        <Heading isAtTop>EKS configuration</Heading>
        <InputRow
          width="350px"
          isRequired
          type="string"
          value={clusterName}
          setValue={(x: string) => setClusterName(x)}
          label="🏷️ Cluster name"
          placeholder="ex: total-perspective-vortex"
        />
        <SelectRow
          options={regionOptions}
          width="350px"
          value={awsRegion}
          scrollBuffer={true}
          dropdownMaxHeight="240px"
          setActiveValue={setAwsRegion}
          label="📍 AWS Region"
        />
        <SelectRow
          options={machineTypeOptions}
          width="350px"
          value={machineType}
          scrollBuffer={true}
          dropdownMaxHeight="240px"
          setActiveValue={setMachineType}
          label="⚙️ Machine type"
        />
      </StyledForm>
      <SaveButton
        disabled={!clusterName && true}
        onClick={createCluster}
        clearPosition
        text="Provision"
      />
    </>
  );
};

export default ProvisionerForm;

const Spacer = styled.div`
  height: 1px;
  width: 17px;
`;

const Img = styled.img`
  height: 18px;
  margin-right: 15px;
`;

const BackButton = styled.div`
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

const StyledForm = styled.div`
  position: relative;
  padding: 30px 30px 25px;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  font-size: 13px;
  margin-bottom: 30px;
`;