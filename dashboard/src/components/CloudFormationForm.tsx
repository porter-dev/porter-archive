import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import { v4 as uuidv4 } from 'uuid';

import api from "shared/api";
import aws from "assets/aws.png";

import { Context } from "shared/Context";

import Text from "./porter/Text";
import Spacer from "./porter/Spacer";
import InputRow from "./form-components/InputRow";
import SaveButton from "./SaveButton";
import Fieldset from "./porter/Fieldset";
import Input from "./porter/Input";
import Button from "./porter/Button";
import DocsHelper from "./DocsHelper";

type Props = {
  goBack: () => void;
  proceed: () => void;
};

const CloudFormationForm: React.FC<Props> = ({
  goBack,
  proceed,
}) => {
  const [AWSAccountID, setAWSAccountID] = useState("");
  const [grantPermissionsError, setGrantPermissionsError] = useState("");
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
        <Spacer y={1} />
        <Fieldset>
          <Text size={16} weight={500}>
            Log in to AWS and "Create stack"
          </Text>
          <Spacer height="15px" />
          <Text color="helper">
            Provide your AWS account ID to log in and grant Porter access to AWS. You will need to select "Create stack" after being redirected to the AWS console below.
          </Text>
          <Spacer y={1} />
          <Input
            label={
              <Flex>
                👤 AWS account ID
                <i 
                  className="material-icons"
                >
                  help_outline
                </i>
              </Flex>
            }
            type="number"
            value={AWSAccountID}
            setValue={(e) => {
              setGrantPermissionsError("");
              setAWSAccountID(e);
            }}
            placeholder="ex: 915037676314"
          />
          <Spacer y={1} />
          <Button
            onClick={() => {
              if (AWSAccountID.length === 12) {
                directToCloudFormation();
              } else {
                setGrantPermissionsError("Invalid AWS account ID");
              }
            }}
            status={grantPermissionsError}
            errorText={grantPermissionsError}
            color="#1E2631"
            withBorder
          >
            <ButtonImg src={aws} /> Grant permissions
          </Button>
        </Fieldset>
        <Spacer y={1} />
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
      <Text size={16} weight={500}>
        <BackButton width="140px" onClick={goBack}>
          <i className="material-icons">first_page</i>
          Select cloud
        </BackButton>
        <Spacer x={1} inline />
        <Img src={aws} />
        Grant AWS permissions
      </Text>
      <Spacer y={1} />
      <Text color="helper">
        Grant Porter permissions to create infrastructure in your AWS account.
      </Text>
      {renderContent()}
    </>
  );
};

export default CloudFormationForm;

const Flex = styled.div`
  display: flex;
  ailgn-items: center;
  > i {
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
  }
`;

const ButtonImg = styled.img`
  height: 14px;
  margin-right: 12px;
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