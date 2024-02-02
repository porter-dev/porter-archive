import React, { useContext, useState } from "react";
import styled from "styled-components";

import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import Spacer from "components/porter/Spacer";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";

import { Context } from "shared/Context";
import compliance from "assets/compliance.svg";

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
          image={compliance}
          title="Compliance"
          description="Configure your Porter infrastructure for various compliance frameworks."
          disableLineBreak
        />
        {currentCluster?.status === "UPDATING_UNAVAILABLE" ? (
          <ClusterProvisioningPlaceholder />
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
