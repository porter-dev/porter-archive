import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import EnvGroupArray from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Text from "components/porter/Text";
import Error from "components/porter/Error";

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
