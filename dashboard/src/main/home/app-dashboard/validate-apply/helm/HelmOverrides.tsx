import React from "react";
import styled from "styled-components";

import yaml from "js-yaml";
import YamlEditor from "components/YamlEditor";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import {useFormContext} from "react-hook-form";
import {PorterAppFormData} from "lib/porter-apps";

type PropsType = {
  projectId: number;
  clusterId: number;
  appName: string;
  appId: number;
  deploymentTargetId: string;
  overrideValues: any;
  setError: (errorString: string) => void;
};

const HelmOverrides: React.FunctionComponent<PropsType> = ({
  overrideValues,
    setError,
}) => {

  const { setValue } = useFormContext<PorterAppFormData>();
  const [currentOverrideValues, setOverrideValues] = React.useState<string>(overrideValues);

  const setFormValue = (value: string) => {
        setOverrideValues(value);
        try {
            if (value == "") {
                setValue("app.helmOverrides", "");
            } else {
                const jsonValues = yaml.load(value);
                setValue("app.helmOverrides", JSON.stringify(jsonValues));
            }
            setError("");
        } catch (e) {
            setError(e.toString());
        }
  }

  return (
        <StyledValuesYaml>
            <Spacer y={.5} />
            <Text color="warner">Note: Values set in Helm overrides will take precedence over corresponding fields in the UI, causing the dashboard to be out of sync.</Text>
            <Spacer y={.5} />
            <Wrapper>
                <YamlEditor
                    value={currentOverrideValues}
                    height="calc(100vh - 412px)"
                    onChange={setFormValue}
                />
            </Wrapper>
        </StyledValuesYaml>
  );

}

export default HelmOverrides;

const Wrapper = styled.div`
  overflow: auto;
  border-radius: 8px;
  border: 1px solid #ffffff33;
`;

const StyledValuesYaml = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 350px);
  font-size: 13px;
  overflow: hidden;
  border-radius: 8px;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
