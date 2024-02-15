import React, { useState } from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Loading from "components/Loading";
import { Error as ErrorComponent } from "components/porter/Error";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import StatusDot from "components/porter/StatusDot";
import Text from "components/porter/Text";
import { type ClientPreflightCheck } from "lib/clusters/types";

import ResolutionStepsModalContents from "./help/preflight/ResolutionStepsModalContents";

type ItemProps = {
  preflightCheck: ClientPreflightCheck;
};
export const CheckItem: React.FC<ItemProps> = ({ preflightCheck }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <CheckItemContainer>
      <CheckItemTop
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
      >
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
        {preflightCheck.error && (
          <ExpandIcon className="material-icons" isExpanded={isExpanded}>
            arrow_drop_down
          </ExpandIcon>
        )}
      </CheckItemTop>
      {isExpanded && preflightCheck.error && (
        <div>
          <ErrorComponent
            message={preflightCheck.error.detail}
            ctaText={
              preflightCheck.error.resolution
                ? "Troubleshooting steps"
                : undefined
            }
            errorModalContents={
              preflightCheck.error.resolution ? (
                <ResolutionStepsModalContents
                  resolution={preflightCheck.error.resolution}
                />
              ) : undefined
            }
          />
          <Spacer y={0.5} />
          {preflightCheck.error.metadata &&
            Object.entries(preflightCheck.error.metadata).map(
              ([key, value]) => (
                <>
                  <div key={key}>
                    <ErrorMessageLabel>{key}:</ErrorMessageLabel>
                    <ErrorMessageContent>{value}</ErrorMessageContent>
                  </div>
                </>
              )
            )}
        </div>
      )}
    </CheckItemContainer>
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
  return (
    <Modal width="600px" closeModal={onClose}>
      <AppearingDiv>
        <Text size={16}>Cluster provision check</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          Your account does not have enough resources to provision this cluster.
          Please correct visit your cloud provider or change your cluster
          configuration, then re-provision.
        </Text>
        <Spacer y={1} />
        {preflightChecks.map((pfc) => (
          <CheckItem preflightCheck={pfc} key={pfc.title} />
        ))}
      </AppearingDiv>
    </Modal>
  );
};

export default PreflightChecksModal;

const AppearingDiv = styled.div<{ color?: string }>`
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  display: flex;
  flex-direction: column;
  color: ${(props) => props.color || "#ffffff44"};

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

const CheckItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 5px;
  font-size: 13px;
  width: 100%;
  margin-bottom: 10px;
  padding-left: 10px;
  cursor: pointer;
  background: ${(props) => props.theme.clickable.bg};
`;

const CheckItemTop = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  background: ${(props) => props.theme.clickable.bg};
`;

const ExpandIcon = styled.i<{ isExpanded: boolean }>`
  margin-left: 8px;
  color: #ffffff66;
  font-size: 20px;
  cursor: pointer;
  border-radius: 20px;
  transform: ${(props) => (props.isExpanded ? "" : "rotate(-90deg)")};
`;
const ErrorMessageLabel = styled.span`
  font-weight: bold;
  margin-left: 10px;
`;
const ErrorMessageContent = styled.div`
  font-family: "Courier New", Courier, monospace;
  padding: 5px 10px;
  border-radius: 4px;
  margin-left: 10px;
  user-select: text;
  cursor: text;
`;
