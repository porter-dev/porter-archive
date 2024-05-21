import React from "react";
import copy from "legacy/assets/copy-left.svg";
import CopyToClipboard from "legacy/components/CopyToClipboard";
import Checkbox from "legacy/components/porter/Checkbox";
import CollapsibleContainer from "legacy/components/porter/CollapsibleContainer";
import { ControlledInput } from "legacy/components/porter/ControlledInput";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { type ClientAddon } from "legacy/lib/addons";
import { Controller, useFormContext } from "react-hook-form";
import styled from "styled-components";

import { useClusterContext } from "main/home/infrastructure-dashboard/ClusterContextProvider";

import { stringifiedDNSRecordType } from "utils/ip";

import AddonSaveButton from "../AddonSaveButton";

const QuivrForm: React.FC = () => {
  const { cluster } = useClusterContext();

  const {
    register,
    formState: { errors },
    control,
    watch,
  } = useFormContext<ClientAddon>();
  const watchExposedToExternalTraffic = watch(
    "config.exposedToExternalTraffic",
    false
  );

  return (
    <div>
      <Text size={16}>Quivr configuration</Text>
      <Spacer y={0.5} />
      <Controller
        name={"config.exposedToExternalTraffic"}
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            checked={value}
            toggleChecked={() => {
              onChange(!value);
            }}
          >
            <Text>Expose to external traffic</Text>
          </Checkbox>
        )}
      />
      <CollapsibleContainer isOpened={watchExposedToExternalTraffic}>
        <Spacer y={0.5} />
        <Text>Custom domain</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          Add an optional custom domain to access Quivr. If you do not provide a
          custom domain, Porter will provision a domain for you.
        </Text>
        {cluster.ingress_ip !== "" && (
          <>
            <Spacer y={0.5} />
            <div style={{ width: "100%" }}>
              <Text color="helper">
                To configure a custom domain, you must add{" "}
                {stringifiedDNSRecordType(cluster.ingress_ip)} pointing to the
                following Ingress IP for your cluster:{" "}
              </Text>
            </div>
            <Spacer y={0.5} />
            <IdContainer>
              <Code>{cluster.ingress_ip}</Code>
              <CopyContainer>
                <CopyToClipboard text={cluster.ingress_ip}>
                  <CopyIcon src={copy} alt="copy" />
                </CopyToClipboard>
              </CopyContainer>
            </IdContainer>
            <Spacer y={0.5} />
          </>
        )}
        <ControlledInput
          type="text"
          width="300px"
          {...register("config.customDomain")}
          placeholder="api.quivr.my-domain.com"
          error={errors.config?.customDomain?.message}
        />
      </CollapsibleContainer>
      <Spacer y={1} />
      <Text>Quivr Domain</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.quivrDomain")}
        placeholder="https://chat.quivr.com"
        error={errors.config?.quivrDomain?.message}
      />
      <Spacer y={1} />
      <Text>OpenAI API Key</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="password"
        width="300px"
        {...register("config.openAiApiKey")}
        placeholder="*****"
        error={errors.config?.openAiApiKey?.message}
      />
      <Spacer y={1} />
      <Text>Supabase URL</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="password"
        width="300px"
        {...register("config.supabaseUrl")}
        placeholder="https://*******.supabase.co"
        error={errors.config?.supabaseUrl?.message}
      />
      <Spacer y={1} />
      <Text>Supabase Service Key</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="password"
        width="300px"
        {...register("config.supabaseServiceKey")}
        placeholder="*****"
        error={errors.config?.supabaseServiceKey?.message}
      />
      <Spacer y={1} />
      <Text>PostgreSQL Database URL</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="password"
        width="300px"
        {...register("config.pgDatabaseUrl")}
        placeholder="postgres://postgres:postgres@my-pg-host.com:5432/quivr"
        error={errors.config?.pgDatabaseUrl?.message}
      />
      <Spacer y={1} />
      <Text>JWT Secret Token</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="password"
        width="300px"
        {...register("config.jwtSecretKey")}
        placeholder="uper-secret-jwt-token-with-at-least-32-characters-long"
        error={errors.config?.jwtSecretKey?.message}
      />
      <Spacer y={1} />
      <Text>Anthropic API Key</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="password"
        width="300px"
        {...register("config.anthropicApiKey")}
        placeholder="*****"
        error={errors.config?.anthropicApiKey?.message}
      />
      <Spacer y={1} />
      <Text>Cohere API Key</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="password"
        width="300px"
        {...register("config.cohereApiKey")}
        placeholder="*****"
        error={errors.config?.cohereApiKey?.message}
      />
      <Spacer y={1} />
      <AddonSaveButton />
    </div>
  );
};

export default QuivrForm;

const Code = styled.span`
  font-family: monospace;
`;

const IdContainer = styled.div`
  background: #26292e;
  border-radius: 5px;
  padding: 10px;
  display: flex;
  width: 100%;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.border};
  align-items: center;
  user-select: text;
`;

const CopyContainer = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
`;

const CopyIcon = styled.img`
  cursor: pointer;
  margin-left: 5px;
  margin-right: 5px;
  width: 15px;
  height: 15px;
  :hover {
    opacity: 0.8;
  }
`;
