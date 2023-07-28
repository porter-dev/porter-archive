import React from 'react';
import { ServiceArray, ServiceString } from '../serviceTypes';
import Button from 'components/porter/Button';
import styled from 'styled-components';
import Input from 'components/porter/Input';
import Spacer from 'components/porter/Spacer';

interface Props {
    customDomains: ServiceArray<ServiceString>;
    onChange: (customDomains: ServiceArray<ServiceString>) => void;
}

const CustomDomains: React.FC<Props> = ({ customDomains, onChange }) => {
    const renderInputs = () => {
        return customDomains.map((customDomain, i) => {
            return (
                <>
                    <AnnotationContainer key={i}>
                        <Input
                            placeholder="ex: my-app.my-domain.com"
                            value={customDomain.value}
                            setValue={(e) => {
                                const newCustomDomains = [...customDomains];
                                newCustomDomains[i] = { readOnly: false, value: e };
                                onChange(newCustomDomains);
                            }}
                            disabled={customDomain.readOnly}
                            width="275px"
                            disabledTooltip={
                                "You may only edit this field in your porter.yaml."
                            }
                        />
                        <DeleteButton
                            onClick={() => {
                                //remove customDomain at the index
                                const newCustomDomains = [...customDomains];
                                newCustomDomains.splice(i, 1);
                                onChange(newCustomDomains);
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
        <CustomDomainsContainer>
            {customDomains.length !== 0 &&
                <>
                    {renderInputs()}
                    <Spacer y={0.5} />
                </>
            }
            <Button
                onClick={() => {
                    const newCustomDomains = [...customDomains];
                    newCustomDomains.push({ readOnly: false, value: "" });
                    onChange(newCustomDomains);
                }}
            >
                + Add Custom Domain
            </Button>
        </CustomDomainsContainer >
    )
};

export default CustomDomains;

const CustomDomainsContainer = styled.div`
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