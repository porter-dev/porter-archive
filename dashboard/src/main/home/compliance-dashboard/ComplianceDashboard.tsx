import React, { useContext, useState } from "react";
import styled from "styled-components";

import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import Button from "components/porter/Button";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import PorterLink from "components/porter/Link";
import ShowIntercomButton from "components/porter/ShowIntercomButton";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";

import { Context } from "shared/Context";
import complianceGrad from "assets/compliance-grad.svg";

import { ActionBanner } from "./ActionBanner";
import { ProjectComplianceProvider } from "./ComplianceContext";
import { ConfigSelectors } from "./ConfigSelectors";
import { ProfileHeader } from "./ProfileHeader";
import { SOC2CostConsent } from "./SOC2CostConsent";
import { VendorChecksList } from "./VendorChecksList";

const ComplianceDashboard: React.FC = () => {
  const { currentProject, currentCluster } = useContext(Context);

  const [showCostConsentModal, setShowCostConsentModal] = useState(false);

  if (!currentProject || !currentCluster) {
    return null;
  }

  return (
    <ProjectComplianceProvider
      projectId={currentProject.id}
      clusterId={currentCluster.id}
    >
      <StyledComplianceDashboard>
        <DashboardHeader
          image={complianceGrad}
          title="Compliance"
          description="Configure your Porter infrastructure for various compliance frameworks."
          disableLineBreak
        />
        {currentCluster?.status === "UPDATING_UNAVAILABLE" ? (
          <ClusterProvisioningPlaceholder />
        ) : currentProject?.sandbox_enabled ? (
          <DashboardPlaceholder>
            <Text size={16}>
              One-Click SOC 2 and HIPAA compliance are not available on the Porter Cloud
            </Text>
            <Spacer y={0.5} />
            <Text color={"helper"}>
              Eject to your own cloud account to enable the Compliance
              dashboard.
            </Text>
            <Spacer y={1} />
            <PorterLink to="https://docs.porter.run/other/eject">
              <Button alt height="35px">
                Eject to AWS, Azure, or GCP
              </Button>
            </PorterLink>
          </DashboardPlaceholder>
        ) : !currentProject?.soc2_controls_enabled ? (
          <DashboardPlaceholder>
            <Text size={16}>Compliance is not enabled for this project</Text>
            <Spacer y={0.5} />
            <Text color={"helper"}>
              Reach out to the Porter team to enable the compliance dashboard on
              your project.
            </Text>
            <Spacer y={1} />
            <ShowIntercomButton
              alt
              message="I would like to enable the compliance dashboard on my project"
              height="35px"
            >
              Request to enable
            </ShowIntercomButton>
          </DashboardPlaceholder>
        ) : (
          <>
            <ConfigSelectors />
            <Spacer y={1} />

            <ProfileHeader />
            <Spacer y={1} />

            <ActionBanner setShowCostConsentModal={setShowCostConsentModal} />
            <Spacer y={1} />

            <VendorChecksList />

            <Spacer y={2} />

            {showCostConsentModal && (
              <SOC2CostConsent
                setShowCostConsentModal={setShowCostConsentModal}
              />
            )}
          </>
        )}
      </StyledComplianceDashboard>
    </ProjectComplianceProvider>
  );
};

export default ComplianceDashboard;

const StyledComplianceDashboard = styled.div`
  width: 100%;
  height: 100%;
`;
