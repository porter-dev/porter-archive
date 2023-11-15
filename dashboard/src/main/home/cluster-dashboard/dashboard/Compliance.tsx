import React, { useState, useEffect } from "react";

import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import ToggleRow from "components/porter/ToggleRow";

import sparkle from "assets/sparkle.svg";

import styled from "styled-components";
import Button from "components/porter/Button";

const Compliance: React.FC = (_) => {
  const [soc2Enabled, setSoc2Enabled] = useState(false);
  const [cloudTrailEnabled, setCloudTrailEnabled] = useState(false);
  const [cloudTrailRetention, setCloudTrailRetention] = useState(false);
  const [ecrScanningEnabled, setEcrScanningEnabled] = useState(false);
  const [kmsEnabled, setKmsEnabled] = useState(false);

  useEffect(() => {
    if (soc2Enabled) {
      setCloudTrailEnabled(true);
      setCloudTrailRetention(true);
      setEcrScanningEnabled(true);
      setKmsEnabled(true);
    }
  }, [soc2Enabled]);

  return (
    <StyledCompliance>
      <Spacer y={1} />
      <Container row>
        <Text size={16}>SOC 2 compliance</Text>
        <Spacer inline x={1} />
        <NewBadge>
          <img src={sparkle} />
          New
        </NewBadge>
      </Container>
      <Spacer y={0.5} />
      <Text color="helper">Configure your AWS infrastructure to be SOC 2 compliant with Porter.</Text>
      <Spacer y={0.5} />
      <ToggleRow
        isToggled={soc2Enabled}
        onToggle={() => { setSoc2Enabled(!soc2Enabled)}}
      >
        <Container row>
          <Text>Enable all SOC 2 settings</Text>
        </Container>
      </ToggleRow>
      <Spacer y={0.5} />
      <GutterContainer>
        <ToggleRow
          isToggled={cloudTrailEnabled}
          onToggle={() => { setCloudTrailEnabled(!cloudTrailEnabled) }}
          disabled={soc2Enabled}
        >
          <Container row>
            <Text>Enable AWS CloudTrail</Text>
            <Spacer inline x={1} />
            <Text color="helper">Forward all application and control plane logs to CloudTrail.</Text>
          </Container>
        </ToggleRow>
        <Spacer y={0.5} />
        <ToggleRow
          isToggled={cloudTrailRetention}
          onToggle={() => { setCloudTrailRetention(!cloudTrailRetention) }}
          disabled={soc2Enabled}
        >
          <Container row>
            <Text>Retain CloudTrail logs for 365 days</Text>
            <Spacer inline x={1} />
            <Text color="helper">Store CloudTrail logs in an S3 bucket for 365 days.</Text>
          </Container>
        </ToggleRow>
        <Spacer y={0.5} />
        <ToggleRow
          isToggled={kmsEnabled}
          onToggle={() => { setKmsEnabled(!kmsEnabled)}}
          disabled={soc2Enabled}
        >
          <Container row>
            <Text>Enable AWS KMS</Text>
            <Spacer inline x={1} />
            <Text color="helper">Encrypt secrets with AWS Key Management Service.</Text>
          </Container>
        </ToggleRow>
        <Spacer y={0.5} />
        <ToggleRow
          isToggled={ecrScanningEnabled}
          onToggle={() => { setEcrScanningEnabled(!ecrScanningEnabled)}}
          disabled={soc2Enabled}
        >
          <Container row>
            <Text>Enable enhanced ECR scanning</Text>
            <Spacer inline x={1} />
            <Text color="helper">Scan ECR image repositories for vulnerabilities.</Text>
          </Container>
        </ToggleRow>
      </GutterContainer>
      <Spacer y={1} />
      <Button>
        Save settings
      </Button>
    </StyledCompliance>
  );
};

export default Compliance;

const StyledCompliance = styled.div``;

const GutterContainer = styled.div`
  border-left: 1px solid #313237;
  margin-left: 5px;
  padding-left: 15px;
`;

const NewBadge = styled.div`
  font-size: 13px;
  padding: 5px 10px;
  background: linear-gradient(110deg, #B6D5F2, #6836E2);
  border-radius: 5px;
  display: flex;
  align-items: center;

  > img {
    height: 14px;
    margin-right: 5px;
  }
`;
