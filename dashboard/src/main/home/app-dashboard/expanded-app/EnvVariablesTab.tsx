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
  updating: boolean;
  updateError: string | null;
  updatePorterApp: () => void;
}

export const EnvVariablesTab: React.FC<EnvVariablesTabProps> = ({
  envVars,
  setEnvVars,
  updating,
  updateError,
  updatePorterApp,
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
        setValues={(x: any) => setEnvVars(x)}
        fileUpload={true}
      />
      <Spacer y={0.5} />
      <Button
        onClick={() => {
          updatePorterApp();
        }}
        status={
          updating ? (
            "loading"
          ) : updateError ? (
            <>
              <Error message={updateError} />
            </>
          ) : undefined
        }
        loadingText={"Updating..."}
      >
        Update app
      </Button>
      <Spacer y={0.5} />
    </>
  );
};
