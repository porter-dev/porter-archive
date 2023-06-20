import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import EnvGroupArray from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Text from "components/porter/Text";
import Error from "components/porter/Error";
import sliders from "assets/sliders.svg";
import EnvGroupModal from "./env-vars/EnvGroupModal";

interface EnvVariablesTabProps {
  envVars: any;
  setEnvVars: (x: any) => void;
  status: React.ReactNode;
  updatePorterApp: any;
  clearStatus: () => void;
}

export const EnvVariablesTab: React.FC<EnvVariablesTabProps> = ({
  envVars,
  setEnvVars,
  status,
  updatePorterApp,
  clearStatus,
}) => {

  const [showEnvModal, setShowEnvModal] = useState(false);
  useEffect(() => {
    setEnvVars(envVars);
  }, [envVars]);


  return (
    <>
      <Text size={16}>Environment variables</Text>
      <Spacer y={0.5} />
      <Text color="helper">Shared among all services.</Text>
      <EnvGroupArray
        key={envVars.length}
        values={envVars}
        setValues={(x: any) => {
          if (status !== "") {
            clearStatus();
          }
          setEnvVars(x)
        }}
        fileUpload={true}
      />
      <LoadButton
        onClick={() => setShowEnvModal(true)}
      >
        <img src={sliders} /> Load from Env Group
      </LoadButton>
      {showEnvModal && <EnvGroupModal closeModal={() => setShowEnvModal(false)} />}

      <Spacer y={0.5} />
      <Button
        onClick={() => {
          updatePorterApp();
        }}
        status={status}
        loadingText={"Updating..."}
      >
        Update app
      </Button>
      <Spacer y={0.5} />
    </>
  );
};

const AddRowButton = styled.div`
  display: flex;
  align-items: center;
  width: 270px;
  font-size: 13px;
  color: #aaaabb;
  height: 32px;
  border-radius: 3px;
  cursor: pointer;
  background: #ffffff11;
  :hover {
    background: #ffffff22;
  }

  > i {
    color: #ffffff44;
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const LoadButton = styled(AddRowButton)`
  background: none;
  border: 1px solid #ffffff55;
  > i {
    color: #ffffff44;
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  > img {
    width: 14px;
    margin-left: 10px;
    margin-right: 12px;
  }
`;
