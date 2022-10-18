import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import React, { useContext, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";
import { SubmitButton } from "../../launch/components/styles";
import { Stack } from "../../types";

const Settings = ({
  stack,
  onDelete,
  onUpdate,
}: {
  stack: Stack;
  onDelete: () => void;
  onUpdate: () => Promise<void>;
}) => {
  const {
    currentCluster,
    currentProject,
    setCurrentOverlay,
    setCurrentError,
  } = useContext(Context);
  const [stackName, setStackName] = useState(stack.name);
  const [buttonStatus, setButtonStatus] = useState("");

  const handleDelete = () => {
    setCurrentOverlay({
      message: `Are you sure you want to delete ${stackName}?`,
      onYes: () => {
        onDelete();
        setCurrentOverlay(null);
      },
      onNo: () => setCurrentOverlay(null),
    });
  };

  const handleStackNameChange = async () => {
    setButtonStatus("loading");
    try {
      await api.updateStack(
        "<token>",
        {
          name: stackName,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          stack_id: stack.id,
          namespace: stack.namespace,
        }
      );
      await onUpdate();
      setButtonStatus("successful");
    } catch (err) {
      setCurrentError(err);
      setButtonStatus("Couldn't update the stack name. Try again later.");
    }
  };

  return (
    <Wrapper>
      <StyledSettingsSection>
        <Heading>Update Stack name</Heading>

        <InputRow
          label="Stack name"
          value={stackName}
          setValue={setStackName as any}
          type="text"
          width="300px"
        />
        <SaveButton
          text="Update"
          onClick={handleStackNameChange}
          disabled={stackName === stack.name}
          makeFlush
          clearPosition
          statusPosition="right"
          status={buttonStatus}
        ></SaveButton>

        <Heading>Additional Settings</Heading>

        <Button color="#b91133" onClick={handleDelete}>
          Delete stack
        </Button>
      </StyledSettingsSection>
    </Wrapper>
  );
};

export default Settings;

const SaveButton = styled(SubmitButton)`
  justify-content: flex-start;
`;

const Wrapper = styled.div`
  width: 100%;
  padding-bottom: 65px;
  height: 100%;
`;

const StyledSettingsSection = styled.div`
  width: 100%;
  background: #ffffff11;
  padding: 0 35px;
  padding-bottom: 15px;
  position: relative;
  border-radius: 8px;
  overflow: auto;
  height: calc(100% - 55px);
`;

const Button = styled.button`
  height: 35px;
  font-size: 13px;
  margin-top: 20px;
  margin-bottom: 30px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: 5px;
  background: ${(props) => (!props.disabled ? props.color : "#aaaabb")};
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }
`;
