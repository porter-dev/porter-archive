import Helper from "components/form-components/Helper";
import TitleSection from "components/TitleSection";
import React, { useContext } from "react";
import { Context } from "shared/Context";
import styled from "styled-components";
import { useSnapshot } from "valtio";
import ProvisionerSettings from "../provisioner/ProvisionerSettings";
import { OFState } from "./state";

const ProvisionerForms = () => {
  const snap = useSnapshot(OFState);
  const { capabilities } = useContext(Context);
  return (
    <>
      <TitleSection>Getting Started</TitleSection>
      <Subtitle>Step 2 of 2</Subtitle>
      <Helper>Provision a new cluster through us or link one later!</Helper>
      <ProvisionerSettings
        isInNewProject={true}
        projectName={snap.StateHandler.project.name}
        provisioner={capabilities.provisioner}
      />
    </>
  );
};

export default ProvisionerForms;

const Subtitle = styled(TitleSection)`
  font-size: 16px;
  margin-top: 16px;
`;
