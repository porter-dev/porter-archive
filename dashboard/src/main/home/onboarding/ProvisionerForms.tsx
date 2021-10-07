import Helper from "components/form-components/Helper";
import TitleSection from "components/TitleSection";
import React from "react";
import styled from "styled-components";
import { useSnapshot } from "valtio";
import ProvisionerSettings from "../provisioner/ProvisionerSettings";
import { OnboardingState } from "./OnboardingState";

const ProvisionerForms = () => {
  const snap = useSnapshot(OnboardingState);
  return (
    <>
      <TitleSection>Getting Started</TitleSection>
      <Subtitle>Step 2 of 2</Subtitle>
      <Helper>Provision a new cluster through us or link one later!</Helper>
      <ProvisionerSettings
        isInNewProject={true}
        projectName={snap.projectName}
        provisioner={snap.isProvisionerEnabled}
      />
    </>
  );
};

export default ProvisionerForms;

const Subtitle = styled(TitleSection)`
  font-size: 16px;
  margin-top: 16px;
`;
