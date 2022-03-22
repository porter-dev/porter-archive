import CheckboxRow from "components/form-components/CheckboxRow";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { capitalize } from "shared/string_utils";
import styled from "styled-components";

const AlertingSettings = () => {
  const { currentCluster, currentProject } = useContext(Context);

  const [alertingConfig, setAlertingConfig] = useState<AlertingBackend[]>([]);

  useEffect(() => {
    let isSubscribed = true;
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
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentProject, currentCluster]);

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
          />
        );
      case "string_input":
        return (
          <InputRow
            type="text"
            value={action.value}
            setValue={(val) => handleInputChange(action, backend, val)}
          />
        );
      case "integer_input":
        return (
          <InputRow
            type="number"
            value={action.value}
            setValue={(val) => handleInputChange(action, backend, val)}
          />
        );
    }
  };

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
    </StyledSettingsSection>
  );
};

export default AlertingSettings;

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
