import React from 'react';
import { ServiceKeyValueArray, ServiceString } from '../serviceTypes';
import Button from 'components/porter/Button';
import styled from 'styled-components';
import Input from 'components/porter/Input';
import Spacer from 'components/porter/Spacer';

interface Props {
    annotations: ServiceKeyValueArray<ServiceString>;
    onChange: (annotations: ServiceKeyValueArray<ServiceString>) => void;
}

const IngressCustomAnnotations: React.FC<Props> = ({ annotations, onChange }) => {
    const renderInputs = () => {
        return annotations.map(({ key: annotationKey, value: annotationValue }, i) => {
            return (
                <>
                    <AnnotationContainer key={i}>
                        <Input
                            placeholder="kubernetes.io/ingress.class"
                            value={annotationKey}
                            setValue={(e) => {
                                const newAnnotations = [...annotations];
                                newAnnotations[i].key = e;
                                onChange(newAnnotations);
                            }}
                            disabled={annotationValue.readOnly}
                            width="275px"
                            disabledTooltip={
                                "You may only edit this field in your porter.yaml."
                            }
                        />
                        <Input
                            placeholder="nginx"
                            value={annotationValue.value}
                            setValue={(e) => {
                                const newAnnotations = [...annotations];
                                newAnnotations[i].value = { readOnly: false, value: e };
                                onChange(newAnnotations);
                            }}
                            disabled={annotationValue.readOnly}
                            width="275px"
                            disabledTooltip={
                                "You may only edit this field in your porter.yaml."
                            }
                        />
                        <DeleteButton
                            onClick={() => {
                                //remove annotation at the index
                                const newAnnotations = [...annotations];
                                newAnnotations.splice(i, 1);
                                onChange(newAnnotations);
                            }}
                        >
                            <i className="material-icons">cancel</i>
                        </DeleteButton>
                    </AnnotationContainer>
                    <Spacer y={0.25} />
                </>
            );
        });
    };

    return (
        <IngressCustomAnnotationsContainer>
            {annotations.length !== 0 &&
                <>
                    {renderInputs()}
                    <Spacer y={0.5} />
                </>
            }
            <Button
                onClick={() => {
                    const newAnnotations = [...annotations];
                    newAnnotations.push({ key: "", value: { readOnly: false, value: "" } });
                    onChange(newAnnotations);
                }}
            >
                + Add Annotation
            </Button>
        </IngressCustomAnnotationsContainer >
    )
};

export default IngressCustomAnnotations;

const IngressCustomAnnotationsContainer = styled.div`
`;

const AnnotationContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
`

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