import React, { useContext, useState } from "react";
import styled from "styled-components";

import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Fieldset from "components/porter/Fieldset";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { usePaymentMethods } from "lib/hooks/useStripe";

import { Context } from "shared/Context";
import cardIcon from "assets/credit-card.svg";
import trashIcon from "assets/trash.png";

import BillingModal from "../modals/BillingModal";

function BillingPage(): JSX.Element {
  const { currentProject, setCurrentOverlay } = useContext(Context);
  const [shouldCreate, setShouldCreate] = useState(false);
  const {
    paymentMethodList,
    refetchPaymentMethods,
    deletePaymentMethod,
    isDeleting,
  } = usePaymentMethods();

  const onCreate = async () => {
    setShouldCreate(false);
    refetchPaymentMethods();
  };

  if (shouldCreate) {
    return (
      <BillingModal
        onCreate={onCreate}
        back={() => {
          setShouldCreate(false);
        }}
        project_id={currentProject?.id}
      />
    );
  }

  return (
    <>
      <Text size={16}>Payment methods</Text>
      <Spacer y={1} />
      <Text color="helper">
        Manage the payment methods associated with this project.
      </Text>
      <Spacer y={1} />
      {paymentMethodList.map((paymentMethod, idx) => {
        return (
          <>
            <Fieldset key={idx}>
              <Container row spaced>
                <Container row>
                  <Icon src={cardIcon} height={"14px"} />
                  <Spacer inline x={1} />
                  <Text color="helper">
                    **** **** **** {paymentMethod.last4}
                  </Text>
                  <Spacer inline x={1} />
                  <Text color="helper">
                    Expires: {paymentMethod.exp_month}/{paymentMethod.exp_year}
                  </Text>
                  <Spacer inline x={1} />
                </Container>
                <DeleteButtonContainer>
                  {isDeleting ? (
                    <Loading />
                  ) : (
                    <DeleteButton
                      onClick={() => {
                        setCurrentOverlay({
                          message: `Are you sure you want to remove this payment method?`,
                          onYes: () => {
                            deletePaymentMethod(paymentMethod.id);
                            setCurrentOverlay(null);
                          },
                          onNo: () => {
                            setCurrentOverlay(null);
                          },
                        });
                      }}
                    >
                      <Icon src={trashIcon} height={"18px"} />
                    </DeleteButton>
                  )}
                </DeleteButtonContainer>
              </Container>
            </Fieldset>
            <Spacer y={1} />
          </>
        );
      })}
      <Button
        onClick={() => {
          setShouldCreate(true);
        }}
      >
        <I className="material-icons">add</I>
        Add Payment Method
      </Button>
    </>
  );
}

export default BillingPage;

const I = styled.i`
  font-size: 18px;
  margin-right: 10px;
`;

const DeleteButton = styled.div`
  cursor: pointer;
`;

const DeleteButtonContainer = styled.div`
  text-align: center;
`;
