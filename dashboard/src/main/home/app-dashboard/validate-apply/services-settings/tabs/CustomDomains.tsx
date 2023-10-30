import React from "react";
import Button from "components/porter/Button";
import styled from "styled-components";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useFieldArray, useFormContext } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";
import { ControlledInput } from "components/porter/ControlledInput";
import CopyToClipboard from "components/CopyToClipboard";
import copy from "assets/copy-left.svg";

interface Props {
  index: number;
  clusterIngressIp: string;
}

const isCustomDomain = (domain: string) => {
  return !domain.includes("onporter.run") && !domain.includes("withporter.run");
}

const CustomDomains: React.FC<Props> = ({ 
  index, 
  clusterIngressIp,
 }) => {
  const { control, register } = useFormContext<PorterAppFormData>();
  const { remove, append, fields } = useFieldArray({
    control,
    name: `app.services.${index}.config.domains`,
  });
  const { append: appendDomainDeletion } = useFieldArray({
    control,
    name: `app.services.${index}.domainDeletions`,
  });

  const onRemove = (i: number, name: string) => {
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
            return isCustomDomain(customDomain.name.value) && (
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
      {clusterIngressIp !== "" && (
        <>
          <Spacer y={0.5} />
          <div style={{width: "550px"}}>
            <Text color="helper">To configure a custom domain, you must add a CNAME record pointing to the following Ingress IP for your cluster: </Text>
          </div>
          <Spacer y={0.5} />
          <IdContainer>
            <Code>{clusterIngressIp}</Code>
            <CopyContainer>
                <CopyToClipboard text={clusterIngressIp}>
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
    background: #26292E;  
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
