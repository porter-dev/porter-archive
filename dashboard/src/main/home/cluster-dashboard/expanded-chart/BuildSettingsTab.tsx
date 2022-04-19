import Heading from "components/form-components/Heading";
import KeyValueArray from "components/form-components/KeyValueArray";
import MultiSaveButton from "components/MultiSaveButton";
import React, { useContext } from "react";
import { Context } from "shared/Context";
import { ChartTypeWithExtendedConfig } from "shared/types";
import styled from "styled-components";

const BuildSettingsTab: React.FC<{ chart: ChartTypeWithExtendedConfig }> = ({
  chart,
}) => {
  const { currentCluster } = useContext(Context);

  return (
    <Wrapper>
      <StyledSettingsSection>
        <Heading>Build step env variables</Heading>

        <KeyValueArray
          values={chart.config.container.env}
          envLoader
          label="Environment Variables: "
          externalValues={{
            namespace: chart.namespace,
            clusterId: currentCluster.id,
          }}
        ></KeyValueArray>
        <MultiSaveButton
          options={[
            {
              text: "Save",
              onClick: () => console.log("Save only"),
              description:
                "Save the values to be applied in the next workflow run",
            },
            {
              text: "Save and re deploy",
              onClick: () => console.log("Save and redeploy"),
              description:
                "Save the values and trigger the workflow to create a new deployment with the latest saved changes",
            },
          ]}
          disabled={false}
          makeFlush={true}
          clearPosition={true}
          statusPosition="right"
          saveText=""
        ></MultiSaveButton>
      </StyledSettingsSection>
    </Wrapper>
  );
};

export default BuildSettingsTab;

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
`;
