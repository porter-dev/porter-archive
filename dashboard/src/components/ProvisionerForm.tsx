import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import aws from "assets/aws.png";

import Heading from "components/form-components/Heading";
import Helper from "./form-components/Helper";
import ProvisionerSettings from "./ProvisionerSettings";
import ProvisionerSettingsOld from "./ProvisionerSettingsOld";

type Props = {
  goBack: () => void;
  credentialId: string;
  AWSAccountID: string;
  useAssumeRole?: boolean;
};

const ProvisionerForm: React.FC<Props> = ({
  goBack,
  credentialId,
  AWSAccountID,
  useAssumeRole,
}) => {
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
      {useAssumeRole ? (
        <ProvisionerSettings credentialId={credentialId} AWSAccountID={AWSAccountID} />
      ) : (
        <ProvisionerSettingsOld credentialId={credentialId} />
      )}
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