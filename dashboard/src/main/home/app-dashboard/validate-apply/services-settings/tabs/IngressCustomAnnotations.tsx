import Button from "components/porter/Button";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import { PorterAppFormData } from "lib/porter-apps";
import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import styled from "styled-components";

type Props = {
  index: number;
};

const IngressCustomAnnotations: React.FC<Props> = ({ index }) => {
  const { control, register } = useFormContext<PorterAppFormData>();
  const { remove, append, fields } = useFieldArray({
    control,
    name: `app.services.${index}.config.ingressAnnotations`,
  });

  return (
    <div>
      {fields.length !== 0
        ? fields.map((annotation, i) => {
            return (
              <>
                <AnnotationContainer key={i}>
                  <ControlledInput
                    type="text"
                    placeholder="kubernetes.io/ingress.class"
                    disabled={annotation.readOnly}
                    width="275px"
                    disabledTooltip={
                      "You may only edit this field in your porter.yaml."
                    }
                    {...register(
                      `app.services.${index}.config.ingressAnnotations.${i}.key`
                    )}
                  />
                  <ControlledInput
                    type="text"
                    placeholder="nginx"
                    disabled={annotation.readOnly}
                    width="275px"
                    disabledTooltip={
                      "You may only edit this field in your porter.yaml."
                    }
                    {...register(
                      `app.services.${index}.config.ingressAnnotations.${i}.value`
                    )}
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
              </>
            );
          })
        : null}
      <Button
        onClick={() => {
          append({
            key: "",
            value: "",
            readOnly: false,
          });
        }}
      >
        + Add Annotation
      </Button>
    </div>
  );
};

export default IngressCustomAnnotations;

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
