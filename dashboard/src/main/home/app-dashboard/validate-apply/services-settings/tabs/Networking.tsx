import React from "react";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import { ClientService } from "lib/porter-apps/services";
import { Controller, useFormContext } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";
import Checkbox from "components/porter/Checkbox";
import Text from "components/porter/Text";
import AnimateHeight from "react-animate-height";
import CustomDomains from "./CustomDomains";

type NetworkingProps = {
  index: number;
  service: ClientService & {
    config: {
      type: "web";
    };
  };
};

const prefixSubdomain = (subdomain: string) => {
  if (subdomain.startsWith("https://") || subdomain.startsWith("http://")) {
    return subdomain;
  }
  return "https://" + subdomain;
};

const Networking: React.FC<NetworkingProps> = ({ index, service }) => {
  const { register, control } = useFormContext<PorterAppFormData>();

  const getApplicationURLText = () => {
    if (service.config.domains.length !== 0) {
      return (
        <Text>
          {`Application URL${service.config.domains.length === 1 ? "" : "s"}: `}
          {service.config.domains.map((d, i) => {
            return (
              <a href={prefixSubdomain(d.name.value)} target="_blank">
                {d.name.value}
                {i !== service.config.domains.length - 1 && ", "}
              </a>
            );
          })}
        </Text>
      );
    }

    return (
      <Text color="helper">
        Application URL: Not generated yet. Porter will generate a URL for you
        on next deploy.
      </Text>
    );
  };

  return (
    <>
      <Spacer y={1} />
      <ControlledInput
        label="Container port"
        type="text"
        placeholder="ex: 80"
        disabled={service.port.readOnly}
        width="300px"
        disabledTooltip={"You may only edit this field in your porter.yaml."}
        {...register(`app.services.${index}.port.value`)}
      />
      <Spacer y={1} />
      <Controller
        name={`app.services.${index}.config.ingressEnabled`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            checked={Boolean(value)}
            disabled={service.config.domains.some((d) => d.name.readOnly)}
            toggleChecked={() => {
              onChange(!value);
            }}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
          >
            <Text color="helper">Expose to external traffic</Text>
          </Checkbox>
        )}
      />
      <AnimateHeight height={service.config.ingressEnabled ? "auto" : 0}>
        <Spacer y={0.5} />
        {getApplicationURLText()}
        <Spacer y={0.5} />
        <Text color="helper">
          Custom domains
          <a
            href="https://docs.porter.run/standard/deploying-applications/https-and-domains/custom-domains"
            target="_blank"
          >
            &nbsp;(?)
          </a>
        </Text>
        <Spacer y={0.5} />
        <CustomDomains index={index} customDomains={service.config.domains} />
        <Spacer y={0.5} />
      </AnimateHeight>
    </>
  );
};

export default Networking;