import React from "react";
import aws from "legacy/assets/aws.png";
import framework from "legacy/assets/framework.svg";
import oneleet from "legacy/assets/oneleet.svg";
import provider from "legacy/assets/provider.svg";
import typeSvg from "legacy/assets/type.svg";
import vanta from "legacy/assets/vanta.svg";
import Container from "legacy/components/porter/Container";
import Image from "legacy/components/porter/Image";
import Select from "legacy/components/porter/Select";
import Spacer from "legacy/components/porter/Spacer";

import { useCompliance } from "./ComplianceContext";

export const ConfigSelectors: React.FC = () => {
  const { profile, setProfile, vendor, setVendor } = useCompliance();
  return (
    <Container row>
      <Select
        options={[
          { value: "soc2", label: "SOC 2" },
          {
            value: "hipaa",
            label: "HIPAA",
          },
        ]}
        value={profile}
        setValue={(value) => {
          if (value === "soc2") {
            setProfile("soc2");
            return;
          }

          setProfile("hipaa");
        }}
        prefix={
          <Container row>
            <Image src={framework} size={15} opacity={0.6} />
            <Spacer inline x={0.5} />
            Framework
          </Container>
        }
      />
      <Spacer inline x={1} />
      <Select
        options={[
          { value: "aws", label: "AWS", icon: aws },
          {
            value: "gcp",
            label: "Google Cloud (coming soon)",
            disabled: true,
          },
          {
            value: "azure",
            label: "Azure (coming soon)",
            disabled: true,
          },
        ]}
        value={"aws"}
        setValue={() => {}}
        prefix={
          <Container row>
            <Image src={typeSvg} size={15} opacity={0.6} />
            <Spacer inline x={0.5} />
            Type
          </Container>
        }
      />
      <Spacer inline x={1} />
      <Select
        options={[
          {
            value: "oneleet",
            label: "Oneleet",
            icon: oneleet,
          },
          { value: "vanta", label: "Vanta", icon: vanta },
          {
            value: "drata",
            label: "Drata (coming soon)",
            disabled: true,
          },
        ]}
        value={vendor}
        setValue={(value) => {
          if (value === "vanta") {
            setVendor("vanta");
            return;
          }

          setVendor("oneleet");
        }}
        prefix={
          <Container row>
            <Image src={provider} size={15} opacity={0.6} />
            <Spacer inline x={0.5} />
            Provider
          </Container>
        }
      />
    </Container>
  );
};
