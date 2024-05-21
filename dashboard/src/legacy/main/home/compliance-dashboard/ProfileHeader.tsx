import React, { useMemo } from "react";
import linkExternal from "legacy/assets/link-external.svg";
import oneleet from "legacy/assets/oneleet.svg";
import vanta from "legacy/assets/vanta.svg";
import Container from "legacy/components/porter/Container";
import Image from "legacy/components/porter/Image";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { match } from "ts-pattern";

import { useCompliance } from "./ComplianceContext";

export const ProfileHeader: React.FC = () => {
  const { profile, vendor } = useCompliance();

  const header = useMemo(() => {
    return match({ profile, vendor })
      .with({ profile: "soc2", vendor: "vanta" }, () => ({
        text: "AWS SOC 2 Controls (Vanta)",
        link: "https://app.vanta.com/tests?framework=soc2&service=aws&taskType=TEST",
        logo: vanta,
      }))
      .with({ profile: "hipaa", vendor: "vanta" }, () => ({
        text: "AWS HIPAA Controls (Vanta)",
        link: "https://app.vanta.com/tests?framework=hipaa&service=aws&taskType=TEST",
        logo: vanta,
      }))
      .with({ profile: "soc2", vendor: "oneleet" }, () => ({
        text: "AWS SOC 2 Controls (OneLeet)",
        link: "https://app.oneleet.io/controls?framework=soc2&service=aws",
        logo: oneleet,
      }))
      .with({ profile: "hipaa", vendor: "oneleet" }, () => ({
        text: "AWS HIPAA Controls (OneLeet)",
        link: "https://app.oneleet.io/controls?framework=hipaa&service=aws",
        logo: oneleet,
      }))
      .exhaustive();
  }, [profile, vendor]);

  return (
    <Container row>
      <Image src={header.logo} size={25} />
      <Spacer inline x={1} />
      <Text
        size={21}
        additionalStyles=":hover { text-decoration: underline } cursor: pointer;"
        onClick={() => {
          if (vendor === "vanta") {
            window.open(header.link, "_blank");
          }
        }}
      >
        {header.text}
        <Spacer inline x={0.5} />
        {vendor === "vanta" && (
          <Image
            src={linkExternal}
            size={16}
            additionalStyles="margin-bottom: -2px"
          />
        )}
      </Text>
    </Container>
  );
};
