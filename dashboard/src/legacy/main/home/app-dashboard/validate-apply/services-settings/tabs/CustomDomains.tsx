import React from "react";
import copy from "legacy/assets/copy-left.svg";
import CopyToClipboard from "legacy/components/CopyToClipboard";
import Button from "legacy/components/porter/Button";
import { ControlledInput } from "legacy/components/porter/ControlledInput";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { type PorterAppFormData } from "legacy/lib/porter-apps";
import { useFieldArray, useFormContext } from "react-hook-form";
import styled from "styled-components";

import { useClusterContext } from "main/home/infrastructure-dashboard/ClusterContextProvider";

import { stringifiedDNSRecordType } from "utils/ip";

type Props = {
  index: number;
};

const isCustomDomain = (domain: string): boolean => {
  return !domain.includes("onporter.run") && !domain.includes("withporter.run");
};

const CustomDomains: React.FC<Props> = ({ index }) => {
  const { cluster } = useClusterContext();

  const { control, register } = useFormContext<PorterAppFormData>();
  const { remove, append, fields } = useFieldArray({
    control,
    name: `app.services.${index}.config.domains`,
  });
  const { append: appendDomainDeletion } = useFieldArray({
    control,
    name: `app.services.${index}.domainDeletions`,
  });

  const onRemove = (i: number, name: string): void => {
    remove(i);
    appendDomainDeletion({
      name,
    });
  };

  return (
    <CustomDomainsContainer>
      {fields.length !== 0 && (
        <>
          {fields.map((customDomain, i) => {
            return (
              isCustomDomain(customDomain.name.value) && (
                <div key={customDomain.id}>
                  <AnnotationContainer>
                    <ControlledInput
                      type="text"
                      placeholder="ex: my-app.my-domain.com"
                      disabled={customDomain.name.readOnly}
                      width="275px"
                      disabledTooltip={
                        "You may only edit this field in your porter.yaml."
                      }
                      {...register(
                        `app.services.${index}.config.domains.${i}.name.value`
                      )}
                    />
                    <DeleteButton
                      onClick={() => {
                        if (!customDomain.name.readOnly) {
                          onRemove(i, customDomain.name.value);
                        }
                      }}
                    >
                      <i className="material-icons">cancel</i>
                    </DeleteButton>
                  </AnnotationContainer>
                  <Spacer y={0.25} />
                </div>
              )
            );
          })}
        </>
      )}
      <Button
        onClick={() => {
          append({
            name: {
              readOnly: false,
              value: "",
            },
          });
        }}
      >
        + Add Custom Domain
      </Button>
      {cluster.ingress_ip !== "" && (
        <>
          <Spacer y={0.5} />
          <div style={{ width: "550px" }}>
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
    </CustomDomainsContainer>
  );
};

export default CustomDomains;

const CustomDomainsContainer = styled.div``;

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
