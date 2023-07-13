import React from "react";
import styled from "styled-components";
import yaml from "js-yaml";
import _ from "lodash";

import { ChartType, CreateUpdatePorterAppOptions } from "shared/types";

import YamlEditor from "components/YamlEditor";
import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

type Props = {
    currentChart: ChartType;
    updatePorterApp: (options: Partial<CreateUpdatePorterAppOptions>) => Promise<void>;
    buttonStatus: any;
};

const HelmValuesTab: React.FC<Props> = ({
    currentChart,
    updatePorterApp,
    buttonStatus,
}) => {
    const [values, setValues] = React.useState<string>(yaml.dump(currentChart.config));

    const handleSaveValues = async () => {
        await updatePorterApp({ full_helm_values: values })
    };


    return (
        <StyledValuesYaml>
            <Wrapper>
                <YamlEditor
                    value={values}
                    onChange={setValues}
                    height="calc(100vh - 412px)"
                />
            </Wrapper>
            <Spacer y={0.5} />
            <Text color="helper">Note: any unsaved service changes from the Overview tab will be lost.</Text>
            <Spacer y={0.5} />
            <Button
                onClick={handleSaveValues}
                status={buttonStatus}
                loadingText={"Updating..."}
            >
                Update values
            </Button>
        </StyledValuesYaml>
    );

}

export default HelmValuesTab;

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
