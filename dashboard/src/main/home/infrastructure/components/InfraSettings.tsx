import React, { useContext, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Heading from "components/form-components/Heading";
import SaveButton from "components/SaveButton";
import Description from "components/Description";
import ConfirmOverlay from "components/ConfirmOverlay";

type Props = {
  infra_id: number;
  onDelete: () => void;
};

const InfraSettings: React.FunctionComponent<Props> = ({
  infra_id,
  onDelete,
}) => {
  const { currentProject, setCurrentError, setCurrentOverlay } = useContext(
    Context
  );

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
      .then(() => {
        setCurrentOverlay(null);
        onDelete();
      })
      .catch((err) => {
        console.error(err);
        setCurrentError(err.response?.data?.error);
      });
  };

  return (
    <>
      <StyledCard>
        <MetadataContainer>
          <Heading>Delete Infrastructure</Heading>
          <Description>
            This will destroy all of the existing cloud infrastructure attached
            to this module.
          </Description>
          <Br />

          <SaveButton
            onClick={() =>
              setCurrentOverlay({
                message: `Are you sure you want to delete this infrastructure?`,
                onYes: deleteInfra,
                onNo: () => setCurrentOverlay(null),
              })
            }
            text="Delete Infrastructure"
            color="#b91133"
            disabled={false}
            makeFlush={true}
            clearPosition={true}
            saveText="Deletion process started, see the Deploys tab for info."
          />
        </MetadataContainer>
      </StyledCard>
    </>
  );
};

export default InfraSettings;

const Br = styled.div`
  width: 100%;
  height: 20px;
`;

const StyledCard = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
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
