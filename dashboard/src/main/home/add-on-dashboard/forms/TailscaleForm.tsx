import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import styled from "styled-components";

import Button from "components/porter/Button";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type ClientAddon } from "lib/addons";

import AddonSaveButton from "../AddonSaveButton";

const TailscaleForm: React.FC = () => {
  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<ClientAddon>();

  const {
    append,
    fields: routes,
    remove,
  } = useFieldArray({
    control,
    name: "config.subnetRoutes",
  });

  return (
    <div>
      <Text size={16}>Tailscale configuration</Text>
      <Spacer y={0.5} />
      <Text>Auth key</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        You can generate an auth key from the Tailscale dashboard by going to
        &quot;Settings&quot; -{">"} &quot;Auth Keys&quot; and generating a
        one-off key. Auth keys will expire after 90 days by default. To disable
        key expiry{" "}
        <a
          href="https://tailscale.com/kb/1028/key-expiry"
          target="_blank"
          rel="noreferrer"
        >
          consult the Tailscale docs.
        </a>
      </Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.authKey")}
        placeholder="*****"
        error={errors.config?.authKey?.message}
      />
      <Spacer y={1} />
      <Text>Subnet routes (optional)</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        By default, the subnet routes for this cluster and all datastores
        connected to this cluster are routed through Tailscale. Enter any
        additional subnet routes you would like to route through Tailscale here.
      </Text>
      <Spacer y={0.5} />
      {routes.map((route, i) => {
        return (
          <div key={route.id}>
            <AnnotationContainer>
              <ControlledInput
                type="text"
                placeholder="ex: 10.123.456.0/20"
                width="275px"
                {...register(`config.subnetRoutes.${i}.route`)}
              />
              <DeleteButton
                onClick={() => {
                  remove(i);
                }}
              >
                <i className="material-icons">cancel</i>
              </DeleteButton>
            </AnnotationContainer>
            <Spacer y={0.25} />
          </div>
        );
      })}
      <Button
        onClick={() => {
          append({
            route: "",
          });
        }}
      >
        + Add subnet route
      </Button>
      <Spacer y={1} />
      <AddonSaveButton />
    </div>
  );
};

export default TailscaleForm;

const AnnotationContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const DeleteButton = styled.div`
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  margin-left: 8px;
  margin-top: -3px;
  justify-content: center;

  > i {
    font-size: 17px;
    color: #ffffff44;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    :hover {
      color: #ffffff88;
    }
  }
`;
