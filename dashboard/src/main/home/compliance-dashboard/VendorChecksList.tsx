import React, { Fragment, useState } from "react";
import styled from "styled-components";

import Container from "components/porter/Container";
import Image from "components/porter/Image";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import greenCheck from "assets/green-check.svg";
import linkExternal from "assets/link-external.svg";
import notApplicable from "assets/not-applicable.svg";
import warning from "assets/warning.svg";

import { useCompliance } from "./ComplianceContext";
import { type VendorCheck } from "./types";

export const VendorChecksList: React.FC = () => {
  const { vendorChecks } = useCompliance();

  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedCheck, setExpandedCheck] = useState<VendorCheck | null>(null);

  return (
    <>
      <Container row>
        <PanelFilter
          isActive={statusFilter === "all"}
          onClick={() => {
            setStatusFilter("all");
          }}
        >
          <Text color="helper">All</Text>
          <Spacer y={0.2} />
          <Text size={18}>45</Text>
        </PanelFilter>
        <Spacer inline x={1.5} />
        <PanelFilter
          isActive={statusFilter === "passing"}
          onClick={() => {
            setStatusFilter("passing");
          }}
        >
          <Container row>
            <Image src={greenCheck} size={10} />
            <Spacer inline x={0.5} />
            <Text color="helper">Passing</Text>
          </Container>
          <Spacer y={0.2} />
          <Text size={18}>3</Text>
        </PanelFilter>
        <Spacer inline x={1.5} />
        <PanelFilter
          isActive={statusFilter === "action-required"}
          onClick={() => {
            setStatusFilter("action-required");
          }}
        >
          <Container row>
            <Image src={warning} size={12} />
            <Spacer inline x={0.5} />
            <Text color="helper">Action required</Text>
          </Container>
          <Spacer y={0.2} />
          <Text size={18}>17</Text>
        </PanelFilter>
        <Spacer inline x={1.5} />
        <PanelFilter
          isActive={statusFilter === "not-applicable"}
          onClick={() => {
            setStatusFilter("not-applicable");
          }}
        >
          <Container row>
            <Image src={notApplicable} size={12} />
            <Spacer inline x={0.5} />
            <Text color="helper">Not applicable</Text>
          </Container>
          <Spacer y={0.2} />
          <Text size={18}>25</Text>
        </PanelFilter>
      </Container>

      <Spacer y={1.5} />

      {vendorChecks.map((check, i) => {
        return (
          <Fragment key={`${check.check}-${i}`}>
            <Container row>
              <Container style={{ width: "200px" }} row>
                {check.status === "passed" && (
                  <Image src={greenCheck} size={10} />
                )}
                {check.status === "failing" && (
                  <Image src={warning} size={14} />
                )}
                {check.status === "not_applicable" && (
                  <Image src={notApplicable} size={14} />
                )}
                <Spacer inline x={0.7} />
                {check.status === "passed" && (
                  <Text color="helper">Passing</Text>
                )}
                {check.status === "failing" && (
                  <ActionRequired>
                    <Text color="helper">Action required</Text>
                    <Spacer inline x={0.5} />
                    <i
                      className="material-icons-outlined"
                      onClick={() => {
                        setExpandedCheck(check);
                      }}
                    >
                      help_outline
                    </i>
                  </ActionRequired>
                )}
                {check.status === "not_applicable" && (
                  <Text color="#494B4F">Not applicable</Text>
                )}
              </Container>
              <Text
                color={check.status === "not_applicable" ? "#494B4F" : ""}
                style={{
                  marginBottom: "-1px",
                  cursor: "pointer",
                }}
                additionalStyles=":hover { text-decoration: underline }"
                onClick={() => {
                  window.open(check.link, "_blank");
                }}
              >
                {check.check}
                <Spacer inline x={0.5} />
                <Image
                  src={linkExternal}
                  opacity={check.status === "not_applicable" ? 0.25 : 1}
                  size={12}
                  additionalStyles="margin-bottom: -2px"
                />
              </Text>
            </Container>
            <Spacer y={1} />
          </Fragment>
        );
      })}

      {expandedCheck && (
        <Modal
          closeModal={() => {
            setExpandedCheck(null);
          }}
        >
          <Container row>
            <Image src={warning} size={16} />
            <Spacer inline x={0.7} />
            <Text size={16}>
              Action required for &ldquo;{expandedCheck.check}&rdquo;
            </Text>
          </Container>
          <Spacer y={0.7} />
          <Text color="helper">
            {expandedCheck.reason.length
              ? expandedCheck.reason
              : "An error occurred during provisioning that is causing for this check to not be fulfilled. Please attempt to re-provision or contract support@porter.run if the error persists."}
          </Text>
        </Modal>
      )}
    </>
  );
};

const PanelFilter = styled.div<{ isActive: boolean }>`
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 10px 15px;
  cursor: pointer;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid ${(props) => (props.isActive ? "#fefefe" : "#494b4f")};
  :hover {
    ${(props) => !props.isActive && "border: 1px solid #7a7b80;"}
  }
`;

const ActionRequired = styled.div`
  > i {
    font-size: 15px;
    color: #aaaabb;
    cursor: pointer;
    :hover {
      color: #ffffff;
    }
  }
  display: flex;
  align-items: center;
`;
