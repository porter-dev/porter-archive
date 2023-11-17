import React, { useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import styled from "styled-components";

import CopyToClipboard from "components/CopyToClipboard";
import Checkbox from "components/porter/Checkbox";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type PorterAppFormData } from "lib/porter-apps";
import { prefixSubdomain, type ClientService } from "lib/porter-apps/services";

import { useClusterResources } from "shared/ClusterResourcesContext";
import copy from "assets/copy-left.svg";

import CustomDomains from "./CustomDomains";
import IngressCustomAnnotations from "./IngressCustomAnnotations";

type NetworkingProps = {
  index: number;
  service: ClientService & {
    config: {
      type: "web";
    };
  };
  internalNetworkingDetails: {
    namespace: string;
    appName: string;
  };
  clusterIngressIp: string;
};

const Networking: React.FC<NetworkingProps> = ({
  index,
  service,
  internalNetworkingDetails: { namespace, appName },
  clusterIngressIp,
}) => {
  const { register, control, watch } = useFormContext<PorterAppFormData>();
  const { currentClusterResources } = useClusterResources();

  const privateService = watch(`app.services.${index}.config.private.value`);

  const port = watch(`app.services.${index}.port.value`);

  const internalURL = useMemo(() => {
    if (port) {
      return `http://${appName}-${service.name.value}.${namespace}.svc.cluster.local:${port}`;
    }
    return `http://${appName}-${service.name.value}.${namespace}.svc.cluster.local`;
  }, [service.name.value, namespace, port]);

  const getApplicationURLText = (): JSX.Element => {
    const numNonEmptyDomains = service.config.domains.filter(
      (d) => d.name.value !== ""
    );
    if (numNonEmptyDomains.length !== 0) {
      return (
        <Text>
          {`External URL${numNonEmptyDomains.length === 1 ? "" : "s"}: `}
          {numNonEmptyDomains.map((d, i) => {
            return (
              <a
                href={prefixSubdomain(d.name.value)}
                target="_blank"
                rel="noreferrer"
                key={i}
              >
                {d.name.value}
                {i !== numNonEmptyDomains.length - 1 && ", "}
              </a>
            );
          })}
        </Text>
      );
    }

    return (
      <Text color="helper">
        External URL: Not generated yet. Porter will generate a URL for you on
        next deploy.
      </Text>
    );
  };

  return (
    <>
      <Spacer y={1} />
      <ControlledInput
        label="Container port"
        type="text"
        placeholder="ex: 3000"
        disabled={service.port.readOnly}
        width="300px"
        disabledTooltip={"You may only edit this field in your porter.yaml."}
        {...register(`app.services.${index}.port.value`)}
      />
      <Spacer y={0.5} />
      {namespace && appName && (
        <>
          <Spacer y={0.5} />
          <Text color="helper">
            Internal URL (for networking between services of this application):
          </Text>
          <Spacer y={0.5} />
          <IdContainer>
            <Code>{internalURL}</Code>
            <CopyContainer>
              <CopyToClipboard text={internalURL}>
                <CopyIcon src={copy} alt="copy" />
              </CopyToClipboard>
            </CopyContainer>
          </IdContainer>
          <Spacer y={0.5} />
        </>
      )}
      <Spacer y={0.5} />
      <Controller
        name={`app.services.${index}.config.private.value`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            checked={!value}
            disabled={service.config.private?.readOnly}
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
      {!privateService && (
        <>
          <Spacer y={0.5} />
          {getApplicationURLText()}
          <Spacer y={0.5} />
          <Text color="helper">
            Custom domains
            <a
              href="https://docs.porter.run/standard/deploying-applications/https-and-domains/custom-domains"
              target="_blank"
              rel="noreferrer"
            >
              &nbsp;(?)
            </a>
          </Text>
          <Spacer y={0.5} />
          <CustomDomains index={index} clusterIngressIp={clusterIngressIp} />
          <Spacer y={0.5} />
          <Text color="helper">
            Ingress Custom Annotations
            <a
              href="https://docs.porter.run/standard/deploying-applications/runtime-configuration-options/web-applications#ingress-custom-annotations"
              target="_blank"
              rel="noreferrer"
            >
              &nbsp;(?)
            </a>
          </Text>
          <Spacer y={0.5} />
          <IngressCustomAnnotations index={index} />
          {currentClusterResources.loadBalancerType === "NLB" && (
            <>
              <Spacer y={1} />
              <Controller
                name={`app.services.${index}.config.disableTls.value`}
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Checkbox
                    checked={!value}
                    disabled={service.config.disableTls?.readOnly}
                    toggleChecked={() => {
                      onChange(!value);
                    }}
                    disabledTooltip={
                      "You may only edit this field in your porter.yaml."
                    }
                  >
                    <Text color="helper">Porter TLS Enabled</Text>
                  </Checkbox>
                )}
              />
            </>
          )}
        </>
      )}
    </>
  );
};

export default Networking;

const Code = styled.span`
  font-family: monospace;
`;

const IdContainer = styled.div`
  background: #26292e;
  border-radius: 5px;
  padding: 10px;
  display: flex;
  width: 550px;
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
