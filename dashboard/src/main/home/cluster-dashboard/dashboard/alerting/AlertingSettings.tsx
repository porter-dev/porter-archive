import CheckboxRow from "components/form-components/CheckboxRow";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import Loading from "components/Loading";
import SaveButton from "components/SaveButton";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { capitalize } from "shared/string_utils";
import styled from "styled-components";

const AlertingSettings = () => {
  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );

  const [alertingConfig, setAlertingConfig] = useState<AlertingBackend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [saveButtonStatus, setSaveButtonStatus] = useState("");

  useEffect(() => {
    let isSubscribed = true;
    setIsLoading(true);
    api
      .getAlertingConfig<AlertingConfigResponse>(
        "<token>",
        {},
        {
          project_id: currentProject?.id,
          cluster_id: currentCluster?.id,
        }
      )
      .then((res) => {
        if (!isSubscribed) {
          return;
        }
        const alertingConfig = res.data?.backends;
        setAlertingConfig(alertingConfig || []);
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        setHasError(true);
        setCurrentError(err);
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentProject, currentCluster]);

  const saveAlertingConfig = async () => {
    setSaveButtonStatus("loading");
    try {
      await api.saveAlertingConfig(
        "<token>",
        {
          backends: alertingConfig,
        },
        { project_id: currentProject?.id, cluster_id: currentCluster?.id }
      );

      setSaveButtonStatus("success");
    } catch (error) {
      setSaveButtonStatus("Couldn't save the new config, please try again.");
    }
  };

  const handleInputChange = (
    action: AlertingAction,
    backend: AlertingBackend,
    newValue: any
  ) => {
    console.log("HERE", newValue);
    setAlertingConfig((prev) => {
      const config = [...prev];
      const modifiedBackend = { ...backend };
      const modifiedAction = { ...action, value: newValue };

      const modifiedActionIndex = backend.actions.findIndex(
        (a) => a.id === action.id
      );

      modifiedBackend.actions.splice(modifiedActionIndex, 1, modifiedAction);

      const modifiedBackendIndex = config.findIndex(
        (b) => b.name === backend.name
      );

      config.splice(modifiedBackendIndex, 1, modifiedBackend);

      return [...config];
    });
  };

  const inputRenderer = (action: AlertingAction, backend: AlertingBackend) => {
    const inputType = action.type;
    switch (inputType) {
      case "toggle":
        return (
          <CheckboxRow
            label={action.description}
            checked={JSON.parse(action.value)}
            toggle={() => handleInputChange(action, backend, !action.value)}
            disabled={saveButtonStatus === "loading"}
          />
        );
      case "string_input":
        return (
          <InputRow
            type="text"
            value={action.value}
            setValue={(val) => handleInputChange(action, backend, val)}
            disabled={saveButtonStatus === "loading"}
          />
        );
      case "integer_input":
        return (
          <InputRow
            type="number"
            value={action.value}
            setValue={(val) => handleInputChange(action, backend, val)}
            disabled={saveButtonStatus === "loading"}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <StyledSettingsSection>
        <Loading height={"400px"} />
      </StyledSettingsSection>
    );
  }

  if (hasError) {
    return (
      <StyledSettingsSection>
        <ErrorText>
          An unexpected error has happened, please try again.
        </ErrorText>
      </StyledSettingsSection>
    );
  }

  return (
    <StyledSettingsSection>
      {alertingConfig.map((backend) => {
        return (
          <>
            <Heading>{capitalize(backend.name)}</Heading>
            {backend.actions.map((action) => {
              return <>{inputRenderer(action, backend)}</>;
            })}
          </>
        );
      })}
      <SaveButtonWrapper>
        <SaveButton
          text="Save alerting config"
          onClick={saveAlertingConfig}
          clearPosition
          status={saveButtonStatus}
          statusPosition={"left"}
        />
      </SaveButtonWrapper>
    </StyledSettingsSection>
  );
};

export default AlertingSettings;

const SaveButtonWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 15px;
`;

const StyledSettingsSection = styled.div`
  margin-top: 35px;
  width: 100%;
  background: #ffffff11;
  padding: 0 35px;
  padding-bottom: 15px;
  position: relative;
  border-radius: 8px;
  overflow: auto;
  height: fit-content;
`;

const ErrorText = styled.div`
  height: 400px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #ffffff90;
`;

type AlertingConfigResponse = {
  backends: AlertingBackend[];
};

type AlertingBackend = {
  name: string;
  actions: AlertingAction[];
};

type AlertingAction = {
  id: string;
  description: string;
  type: "toggle" | "string_input" | "integer_input";
  value: any;
};
