import React from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import { Error as ErrorComponent } from "components/porter/Error";
import Expandable from "components/porter/Expandable";
import Modal from "components/porter/Modal";
import PorterOperatorComponent from "components/porter/PorterOperatorComponent";
import ShowIntercomButton from "components/porter/ShowIntercomButton";
import Spacer from "components/porter/Spacer";
import StatusDot from "components/porter/StatusDot";
import Text from "components/porter/Text";
import { type ClientPreflightCheck } from "lib/clusters/types";

import { useClusterFormContext } from "../ClusterFormContextProvider";
import ResolutionStepsModalContents from "./help/preflight/ResolutionStepsModalContents";

type ItemProps = {
  preflightCheck: ClientPreflightCheck;
  preExpanded?: boolean;
};
export const CheckItem: React.FC<ItemProps> = ({
  preflightCheck,
  preExpanded = true,
}) => {
  const renderHeader = (): React.ReactElement => {
    return (
      <CheckItemTop>
        {match(preflightCheck.status)
          .with("pending", () => (
            <Loading offset="0px" width="20px" height="20px" />
          ))
          .otherwise((status) =>
            match(status)
              .with("success", () => <StatusDot status="available" />)
              .with("failure", () => <StatusDot status="failing" />)
              .exhaustive()
          )}
        <Spacer inline x={1} />
        <Text style={{ flex: 1 }}>{preflightCheck.title}</Text>
        {preflightCheck?.error?.metadata?.quotaName && (
          <Text color={"helper"}>
            {preflightCheck?.error?.metadata?.quotaName}
          </Text>
        )}
      </CheckItemTop>
    );
  };

  if (!preflightCheck.error) {
    return renderHeader();
  }

  return (
    <Expandable preExpanded={preExpanded} header={renderHeader()}>
      <div>
        <ErrorComponent
          message={preflightCheck.error.detail}
          ctaText={
            preflightCheck.error.resolution
              ? "Troubleshooting steps"
              : undefined
          }
          metadata={preflightCheck.error.metadata}
          errorModalContents={
            preflightCheck.error.resolution ? (
              <ResolutionStepsModalContents
                resolution={preflightCheck.error.resolution}
              />
            ) : undefined
          }
        />
        <Spacer y={0.5} />
      </div>
    </Expandable>
  );
};

type Props = {
  onClose: () => void;
  preflightChecks: ClientPreflightCheck[];
};
const PreflightChecksModal: React.FC<Props> = ({
  onClose,
  preflightChecks,
}) => {
  const { submitSkippingPreflightChecks } = useClusterFormContext();

  return (
    <Modal width="600px" closeModal={onClose}>
      <AppearingDiv>
        <Text size={16}>Cluster provision check</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          Your cloud provider account does not have the required permissions
          and/or resources to provision with Porter. Please resolve the
          following issues or change your cluster configuration and try again.
        </Text>
        <Spacer y={1} />
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {preflightChecks.map((pfc, idx) => (
            <CheckItem
              preflightCheck={pfc}
              key={pfc.title}
              preExpanded={idx === 0}
            />
          ))}
        </div>
        <Spacer y={1} />
        <Container row spaced>
          <ShowIntercomButton
            message={"I need help resolving cluster preflight checks."}
          >
            Talk to support
          </ShowIntercomButton>
          <PorterOperatorComponent>
            <Button
              onClick={async () => {
                await submitSkippingPreflightChecks();
              }}
              color="red"
            >
              Skip preflight checks
            </Button>
          </PorterOperatorComponent>
        </Container>
      </AppearingDiv>
    </Modal>
  );
};

export default PreflightChecksModal;

const AppearingDiv = styled.div`
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  display: flex;
  flex-direction: column;
  color: #fff;
  max-height: 80vh;
  overflow-y: auto;

  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const CheckItemTop = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  background: ${(props) => props.theme.clickable.bg};
`;
