import React from "react";
import { Contract } from "@porter-dev/api-contracts";
import styled from "styled-components";

import ClickToCopy from "components/porter/ClickToCopy";
import Modal from "components/porter/Modal";

import { useClusterContext } from "./ClusterContextProvider";

type Props = {
  onClose: () => void;
};
const ClusterContractViewModal: React.FC<Props> = ({ onClose }) => {
  const { cluster } = useClusterContext();
  return (
    <Modal closeModal={onClose} width={"800px"}>
      <div style={{ overflowY: "auto", maxHeight: "80vh" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <StyledCell width={"100px"}>created_at</StyledCell>
              <StyledCell>{cluster.contract?.created_at}</StyledCell>
            </tr>
            <tr>
              <StyledCell width={"100px"}>decoded contract</StyledCell>
              <StyledCell>
                <ClickToCopy>
                  {JSON.stringify(
                    Contract.fromJsonString(
                      atob(cluster.contract?.base64_contract ?? ""),
                      {
                        ignoreUnknownFields: true,
                      }
                    )
                  )}
                </ClickToCopy>
              </StyledCell>
            </tr>
            <tr>
              <StyledCell width={"100px"}>condition</StyledCell>
              <StyledCell>{cluster.contract?.condition}</StyledCell>
            </tr>
            <tr>
              <StyledCell width={"100px"}>condition metadata</StyledCell>
              <StyledCell>
                {JSON.stringify(cluster.contract?.condition_metadata)}
              </StyledCell>
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
};

const StyledCell = styled.td<{ width?: string }>`
  padding: 8px;
  border: 1px solid #ddd;
  text-align: left;
  max-width: 200px;
  word-wrap: break-word;
  vertical-align: top;
  width: ${(props) => props.width};
`;

export default ClusterContractViewModal;
