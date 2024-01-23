import React, { useContext, useState } from "react";
import styled from "styled-components";

import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import Container from "components/porter/Container";
import Image from "components/porter/Image";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";

import { Context } from "shared/Context";
import compliance from "assets/compliance.svg";
import linkExternal from "assets/link-external.svg";
import vanta from "assets/vanta.svg";

import { ActionBanner } from "./ActionBanner";
import { ProjectComplianceProvider } from "./ComplianceContext";
import { ConfigSelectors } from "./ConfigSelectors";
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
            <Container row>
              <Image src={vanta} size={25} />
              <Spacer inline x={1} />
              <Text
                size={21}
                additionalStyles=":hover { text-decoration: underline } cursor: pointer;"
                onClick={() => {
                  window.open(
                    "https://app.vanta.com/tests?framework=soc2&service=aws&taskType=TEST",
                    "_blank"
                  );
                }}
              >
                AWS SOC 2 Controls (Vanta)
                <Spacer inline x={0.5} />
                <Image
                  src={linkExternal}
                  size={16}
                  additionalStyles="margin-bottom: -2px"
                />
              </Text>
            </Container>

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
