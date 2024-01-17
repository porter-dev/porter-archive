import React from "react";
import _ from "lodash";
import styled from "styled-components";

import Spacer from "components/porter/Spacer";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";

import compliance from "assets/compliance.svg";
import Container from "components/porter/Container";

import Select from "components/porter/Select";
import framework from "assets/framework.svg";
import typeSvg from "assets/type.svg";
import provider from "assets/provider.svg";
import aws from "assets/aws.png";
import vanta from "assets/vanta.svg";

type Props = {
  projectId: number;
};

const ComplianceDashboard: React.FC<Props> = () => {
  return (
    <StyledComplianceDashboard>
      <DashboardHeader
        image={compliance}
        title="Compliance"
        description="Configure your Porter infrastructure for various compliance frameworks."
        disableLineBreak
      />
      <Container row>
        <Select
          options={[
            { value: "soc-2", label: "SOC 2" },
            { value: "hipaa", label: "HIPAA (request access)", disabled: true },
          ]}
          width="200px"
          value={"soc-2"}
          setValue={() => {
          }
          }
          prefix={
            <Container row>
              <Img src={framework} />
              Framework
            </Container>
          }
        />
        <Spacer inline x={1} />
        <Select
          options={[
            { value: "aws", label: "AWS", icon: aws },
            { value: "gcp", label: "Google Cloud (coming soon)", disabled: true },
            { value: "azure", label: "Azure (coming soon)", disabled: true },
          ]}
          width="180px"
          value={"aws"}
          setValue={() => {
          }
          }
          prefix={
            <Container row>
              <Img src={typeSvg} />
              Type
            </Container>
          }
        />
        <Spacer inline x={1} />
        <Select
          options={[
            { value: "vanta", label: "Vanta", icon: vanta },
            { value: "drata", label: "Drata (coming soon)", disabled: true },
            { value: "oneleet", label: "Oneleet (coming soon)", disabled: true },
          ]}
          width="200px"
          value={"vanta"}
          setValue={() => {
          }
          }
          prefix={
            <Container row>
              <Img src={provider} />
              Provider
            </Container>
          }
        />
      </Container>
      <Spacer inline width="10px" />
    </StyledComplianceDashboard>
  );
};

export default ComplianceDashboard;

const StyledComplianceDashboard = styled.div`
  width: 100%;
  height: 100%;
`;

const Img = styled.img`
  width: 15px;
  height: 15px;
  opacity: 0.6;
  margin-right: 7px;
`;