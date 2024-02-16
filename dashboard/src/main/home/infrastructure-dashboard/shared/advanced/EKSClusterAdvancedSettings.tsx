import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import styled from "styled-components";

import Checkbox from "components/porter/Checkbox";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type ClientClusterContract } from "lib/clusters/types";

const EKSClusterAdvancedSettings: React.FC = () => {
  const { control } = useFormContext<ClientClusterContract>();
  return (
    <div>
      <Text size={14}>Logging</Text>
      <Spacer y={0.5} />
      <SettingsGroupContainer>
        <Controller
          name={`cluster.config.logging.isApiServerLogsEnabled`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Checkbox
              checked={value}
              toggleChecked={() => {
                onChange(!value);
              }}
            >
              <Text color="helper">
                Enable API Server logs in CloudWatch for this cluster
              </Text>
            </Checkbox>
          )}
        />
        <Controller
          name={`cluster.config.logging.isAuditLogsEnabled`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Checkbox
              checked={value}
              toggleChecked={() => {
                onChange(!value);
              }}
            >
              <Text color="helper">
                Enable Audit logs in CloudWatch for this cluster
              </Text>
            </Checkbox>
          )}
        />
        <Controller
          name={`cluster.config.logging.isAuthenticatorLogsEnabled`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Checkbox
              checked={value}
              toggleChecked={() => {
                onChange(!value);
              }}
            >
              <Text color="helper">
                Enable Authenticator logs in CloudWatch for this cluster
              </Text>
            </Checkbox>
          )}
        />
        <Controller
          name={`cluster.config.logging.isControllerManagerLogsEnabled`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Checkbox
              checked={value}
              toggleChecked={() => {
                onChange(!value);
              }}
            >
              <Text color="helper">
                Enable Controller Manager logs in CloudWatch for this cluster
              </Text>
            </Checkbox>
          )}
        />
        <Controller
          name={`cluster.config.logging.isSchedulerLogsEnabled`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Checkbox
              checked={value}
              toggleChecked={() => {
                onChange(!value);
              }}
            >
              <Text color="helper">
                Enable Scheduler logs in CloudWatch for this cluster
              </Text>
            </Checkbox>
          )}
        />
      </SettingsGroupContainer>
      <Spacer y={1} />
      <Text size={14}>Load balancer</Text>
      <Spacer y={0.5} />
      {/* <SettingsGroupContainer>
          <Controller
            name={`cluster.config.loadBalancer.isLoadBalancerEnabled`}
            control={control}
            render={({ field: { value, onChange } }) => (
              <Checkbox
                checked={value}
                toggleChecked={() => {
                  onChange(!value);
                }}
              >
                <Text color="helper">
                  Enable Load Balancer for this cluster
                </Text>
              </Checkbox>
            )}
          /> */}
    </div>
  );
};

export default EKSClusterAdvancedSettings;

const SettingsGroupContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
