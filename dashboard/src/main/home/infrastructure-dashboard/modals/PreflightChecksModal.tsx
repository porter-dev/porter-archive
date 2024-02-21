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
import Expandable from "components/porter/Expandable";

type ItemProps = {
  preflightCheck: ClientPreflightCheck;
  defaultExpanded?: boolean;
};
export const CheckItem: React.FC<ItemProps> = ({ preflightCheck, defaultExpanded = true }) => {
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
        {preflightCheck?.error?.metadata?.quota && <Text color={"helper"}>{preflightCheck?.error?.metadata?.quota}</Text>}
    </CheckItemTop>
    );
  }

  if (!preflightCheck.error) {
      return renderHeader()
  }

    return (
                <Expandable
                    preExpanded={defaultExpanded}
                    header={renderHeader()}>
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
                        <Spacer y={0.5}/>
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
  return (
    <Modal width="600px" closeModal={onClose}>
      <AppearingDiv>
        <Text size={16}>Cluster provision check</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          Your cloud provider account does not have the required permissions and/or
          resources to provision with Porter. Please resolve the following issues or change
          your cluster configuration and try again.
        </Text>
        <Spacer y={1} />
        {preflightChecks.map((pfc, idx) => (
          <CheckItem preflightCheck={pfc} key={pfc.title} defaultExpanded={idx === 0}/>
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
  cursor: pointer;
  &:hover {
    border: 1px solid #7a7b80;
  }
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