import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import styled from "styled-components";

import Button from "components/porter/Button";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import { type PorterAppFormData } from "lib/porter-apps";

type Props = {
  index: number;
};

const IngressCustomAnnotations: React.FC<Props> = ({ index }) => {
  const { control, register, setValue } = useFormContext<PorterAppFormData>();
  const { remove, append, fields } = useFieldArray({
    control,
    name: `app.services.${index}.config.ingressAnnotations`,
  });
  const { append: appendAnnotationDeletion, fields: fieldsAnnotationDeletion } =
    useFieldArray({
      control,
      name: `app.services.${index}.ingressAnnotationDeletions`,
    });

  const onRemove = (i: number, key: string): void => {
    remove(i);
    appendAnnotationDeletion({
      key,
    });
  };

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
                      `app.services.${index}.config.ingressAnnotations.${i}.key`,
                      {
                        // If the user edits an existing key, we need to mark the old key as deleted.
                        // Otherwise, the backend will merge the old set of keys with the new set, and the original key
                        // will still exist.
                        onChange: (e) => {
                          if (
                            e.target.value &&
                            e.target.value !== annotation.key
                          ) {
                            setValue(
                              `app.services.${index}.config.ingressAnnotations.${i}.key`,
                              e.target.value
                            );
                            if (
                              !fieldsAnnotationDeletion.find(
                                (d) => d.key === annotation.key
                              )
                            ) {
                              appendAnnotationDeletion({ key: annotation.key });
                            }
                          }
                        },
                      }
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
                      if (!annotation.readOnly) {
                        onRemove(i, annotation.key);
                      }
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
