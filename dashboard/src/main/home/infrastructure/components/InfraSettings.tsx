import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import {
  Infrastructure,
  Operation,
  OperationStatus,
  OperationType,
} from "shared/types";
import { readableDate } from "shared/string_utils";
import Placeholder from "components/Placeholder";
import { useWebsockets } from "shared/hooks/useWebsockets";
import Heading from "components/form-components/Heading";
import SaveButton from "components/SaveButton";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";

type Props = {
  infra_id: number;
  onDelete: () => void;
};

const InfraSettings: React.FunctionComponent<Props> = ({
  infra_id,
  onDelete,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [operation, setOperation] = useState<Operation>(null);
  const [logs, setLogs] = useState<string[]>(null);
  const [deleteText, setDeleteText] = useState<string>("");
  const { currentProject, setCurrentError } = useContext(Context);

  const deleteInfra = () => {
    api
      .deleteInfra(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          infra_id: infra_id,
        }
      )
      .then()
      .catch((err) => {
        console.error(err);
        setHasError(true);
        setCurrentError(err.response?.data?.error);
        setIsLoading(false);
      });
  };

  return (
    <StyledCard>
      <MetadataContainer>
        <Heading>Delete Infrastructure</Heading>
        <Description>
          This will destroy all of the existing cloud infrastructure attached to
          this module.
        </Description>
        <Br />
        <SaveButton
          onClick={deleteInfra}
          text="Delete Infrastructure"
          color="#b91133"
          disabled={false}
          makeFlush={true}
          clearPosition={true}
          saveText="Deletion process started, see the Deploys tab for info."
        />
      </MetadataContainer>
    </StyledCard>
  );
};

export default InfraSettings;

const DatabasesListWrapper = styled.div``;

const EventsGrid = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;

const PorterFormContainer = styled.div`
  position: relative;
  min-width: 300px;
`;

const Br = styled.div`
  width: 100%;
  height: 20px;
`;

const StyledCard = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;

const BackArrowContainer = styled.div`
  width: 100%;
  height: 24px;
`;

const BackArrow = styled.div`
  > i {
    color: #aaaabb;
    font-size: 18px;
    margin-right: 6px;
  }

  color: #aaaabb;
  display: flex;
  align-items: center;
  font-size: 14px;
  cursor: pointer;
  width: 120px;
`;

const Description = styled.div`
  width: 100%;
  color: white;
  font-size: 13px;
  color: #aaaabb;
  margin: 20px 0 10px 0;
  display: flex;
  align-items: center;
`;

const MetadataContainer = styled.div`
  margin-bottom: 3px;
  border-radius: 6px;
  background: #2e3135;
  padding: 0 20px;
  overflow-y: auto;
  min-height: 180px;
  font-size: 13px;
`;

const LogTitleContainer = styled.div`
  padding: 0 20px;
  margin-bottom: 20px;
`;

const LogSectionContainer = styled.div`
  margin-bottom: 3px;
  border-radius: 6px;
  background: #2e3135;
  overflow: hidden;
  max-height: 500px;
  font-size: 13px;
`;

const NextIconContainer = styled.div`
  width: 30px;
  padding-top: 2px;
`;

const ContentContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
`;

const Icon = styled.span<{ status: OperationStatus }>`
  font-size: 20px;
  margin-left: 10px;
  margin-right: 20px;
  color: ${({ status }) => (status === "errored" ? "#ff385d" : "#aaaabb")};
`;

const EventInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const EventName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const Helper = styled.span`
  text-transform: capitalize;
  color: #ffffff44;
  margin-right: 5px;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const TimestampContainer = styled.div`
  display: flex;
  white-space: nowrap;
  align-items: center;
  justify-self: flex-end;
  color: #ffffff55;
  margin-right: 10px;
  font-size: 13px;
  min-width: 130px;
  justify-content: space-between;
`;

const TimestampIcon = styled.span`
  margin-right: 7px;
  font-size: 18px;
`;

const LogContainer = styled.div`
  padding: 14px;
  font-size: 13px;
  background: #121318;
  user-select: text;
  overflow-wrap: break-word;
  overflow-y: auto;
  min-height: 55px;
  color: #aaaabb;
  height: 400px;
`;

const Log = styled.div`
  font-family: monospace, sans-serif;
  font-size: 12px;
  color: white;
`;
