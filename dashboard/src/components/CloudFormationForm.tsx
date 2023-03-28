import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import { v4 as uuidv4 } from 'uuid';

import api from "shared/api";
import aws from "assets/aws.png";

import { Context } from "shared/Context";

import Heading from "components/form-components/Heading";
import Helper from "./form-components/Helper";
import InputRow from "./form-components/InputRow";
import SaveButton from "./SaveButton";
import Loading from "./Loading";

type Props = {
  goBack: () => void;
  proceed: () => void;
};

type AWSCredential = {
  created_at: string;
  id: number;
  user_id: number;
  project_id: number;
  aws_arn: string;
};


const CloudFormationForm: React.FC<Props> = ({
  goBack,
  proceed,
}) => {
  const { currentProject } = useContext(Context);
  const [AWSCredentials, setAWSCredentials] = useState<AWSCredential[]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [AWSAccountID, setAWSAccountID] = useState("");
  const [selectedCredentials, setSelectedCredentials] = useState<AWSCredential>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roleStatus, setRoleStatus] = useState("");

  const checkIfRoleExists = () => {
    let targetARN = `arn:aws:iam::${AWSAccountID}:role/porter-role`
    setRoleStatus("loading");
    // api
    //   .preflightCheckAWS(
    //     "<token>",
    //     {
    //       target_arn: targetARN,
    //       external_id: externalID,
    //     },
    //     {
    //       id: currentProject.id,
    //     }
    //   )
    //   .then(({ data }) => {
    //     setRoleStatus("successful");
    //     proceed();
    //   })
    //   .catch((err) => {
    //     console.error(err);
    //     setCreateStatus("Error creating credentials");
    //   });
      setRoleStatus("successful");
      proceed();
  };

  const directToCloudFormation = () => {
    let externalId = uuidv4();
    window.open(
      `https://console.aws.amazon.com/cloudformation/home?
      #/stacks/create/review?templateURL=https://porter-role.s3.us-east-2.amazonaws.com/cloudformation-policy.json&stackName=PorterRole&param_ExternalIdParameter=${externalId}`
    )
  }

  const renderContent = () => {
    return (
      <>
        <StyledForm>
          <InputRow
            type="string"
            value={AWSAccountID}
            setValue={(e: string) => setAWSAccountID(e)}
            label="👤 AWS Account ID"
            placeholder="ex: 915037676314"
            isRequired
          />
          <SaveButton
            disabled={AWSAccountID === ""}
            onClick={directToCloudFormation}
            clearPosition
            text="Grant Permissions"
          />
        </StyledForm>
        <SaveButton
          onClick={checkIfRoleExists}
          status={roleStatus}
          statusPosition="right"
          clearPosition
          text="Continue"
        />
      </>
    );
  }

  return (
    <>
      <Heading isAtTop>
        <BackButton width="140px" onClick={goBack}>
          <i className="material-icons">first_page</i>
          Select cloud
        </BackButton>
        <Spacer />
        <Img src={aws} />
        Grant AWS Permissions
      </Heading>
      <Helper>
        Grant Porter permissions to create infrastructure in your AWS account.
      </Helper>
      {
        renderContent()
      }
    </>
  );
};

export default CloudFormationForm;

const CloseButton = styled.div`
  position: absolute;
  top: 15px;
  right: 15px;
  padding: 5px;
  border-radius: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #ffffff11;
  :hover {
    background: #ffffff22;
    > i {
      color: #ffffff;
    }
  }
  > i {
    font-size: 20px;
    color: #aaaabb;
  }
`;

const Spacer = styled.div`
  height: 1px;
  width: 17px;
`;

const Icon = styled.img`
  width: 15px;
  margin-right: 15px;
`;

const CreateRow = styled.div`
  height: 50px;
  display: flex;
  cursor: pointer;
  align-items: center;
  font-size: 13px;
  padding: 20px;
  background: #ffffff11;
  :hover {
    background: #ffffff18; 
  }
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
  padding: 15px 30px 25px;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  font-size: 13px;
  margin-bottom: 30px;
`;