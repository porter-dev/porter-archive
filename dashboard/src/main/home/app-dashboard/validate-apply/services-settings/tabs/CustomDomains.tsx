import React from "react";
import Button from "components/porter/Button";
import styled from "styled-components";
import Spacer from "components/porter/Spacer";
import { useFieldArray, useFormContext } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";
import { ControlledInput } from "components/porter/ControlledInput";

interface Props {
  index: number;
}

const CustomDomains: React.FC<Props> = ({ index }) => {
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
            return !customDomain.name.value.includes("onporter.run") && !customDomain.name.value.includes("withporter.run") ? (
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
            ) : null;
          })}
          <Spacer y={0.5} />
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
