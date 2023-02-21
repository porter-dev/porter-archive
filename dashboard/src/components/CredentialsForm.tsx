import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";

import api from "shared/api";
import aws from "assets/aws.png";
import { Context } from "shared/Context";

import Heading from "components/form-components/Heading";
import Helper from "./form-components/Helper";
import InputRow from "./form-components/InputRow";
import SaveButton from "./SaveButton";

type Props = {
  goBack: () => void;
};

type AWSCredential = {
  created_at: string;
  id: number;
  user_id: number;
  project_id: number;
  aws_arn: string;
};


const CredentialsForm: React.FC<Props> = ({
  goBack,
}) => {
  const { currentProject } = useContext(Context);
  const [awsCredentials, setAWSCredentials] = useState<AWSCredential[]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [awsAccessKeyID, setAWSAccessKeyID] = useState("");
  const [awsSecretAccessKey, setAWSSecretAccessKey] = useState("");

  useEffect(() => {
    api
      .getAWSIntegration(
        "<token>",
        {},
        {
          project_id: currentProject.id,
        }
      )
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          throw Error("Data is not an array");
        }
        setAWSCredentials(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [currentProject]);

  const renderContent = () => {
    if (awsCredentials.length > 0) {
      return (
        <CredentialList>
          {
            awsCredentials.map((cred: AWSCredential, i: number) => {
              return (
                <Credential key={cred.id} isLast={awsCredentials.length - 1 === i}>
                  <Name>{cred.aws_arn || "n/a"}</Name>
                </Credential>
              );
            })
          }
        </CredentialList>
      );
    }
    return (
      <>
        <InputRow 
          type="string"
          value={awsAccessKeyID}
          setValue={(e: string) => setAWSAccessKeyID(e)}
          label="👤 AWS access ID"
          placeholder="ex: AKIAIOSFODNN7EXAMPLE"
          isRequired
        />
        <InputRow 
          type="password"
          value={awsSecretAccessKey}
          setValue={(e: string) => setAWSSecretAccessKey(e)}
          label="🔒 AWS secret key"
          placeholder="○ ○ ○ ○ ○ ○ ○ ○ ○"
          isRequired
        />
        <Br />
        <SaveButton
          disabled={awsAccessKeyID === "" || awsSecretAccessKey === ""}
          onClick={() => console.log("go straight to editor form")}
          clearPosition
          text="Continue"
        />
      </>
    );
  }

  return (
    <StyledCredentialsForm>
      <Heading isAtTop>
        <BackButton onClick={goBack}>
          <i className="material-icons">keyboard_backspace</i>
        </BackButton>
        <Img src={aws} />
        AWS credentials
      </Heading>
      <Helper>
        Select your credentials from the list below, or link a new set of credentials:
      </Helper>
      {
        isLoading ? (
          <>Loading . . .</>
        ) : (
          renderContent()
        )
      }
    </StyledCredentialsForm>
  );
};

export default CredentialsForm;

const Br = styled.div`
  width: 100%;
  height: 25px;
`;

const Img = styled.img`
  height: 18px;
  margin-right: 15px;
`;

const BackButton = styled.div`
  width: 30px;
  height: 30px;
  margin-left: -5px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  border-radius: 50%;
  right: 10px;
  top: 10px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }

  > i {
    font-size: 20px;
    color: #aaaabb;
  }
`;

const Name = styled.div`
  font-size: 14px;
  font-weight: 500;
`;

const Credential = styled.div<{ isLast?: boolean}>`
  height: 50px;
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: ${props => props.isLast ? "" : "1px solid #7a7b80"};
  background: #ffffff11;
`;

const CredentialList = styled.div`
  width: 100%;
  border: 1px solid #7a7b80;
  border-radius: 5px;
`;

const StyledCredentialsForm = styled.div`
  padding: 30px;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  font-size: 13px;
`;