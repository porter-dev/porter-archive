import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Fieldset from "components/porter/Fieldset";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import {
  checkBillingCustomerExists,
  checkIfProjectHasPayment,
  usePaymentMethods,
  useSetDefaultPaymentMethod,
} from "lib/hooks/useStripe";

import { Context } from "shared/Context";
import cardIcon from "assets/credit-card.svg";
import trashIcon from "assets/trash.png";

import BillingModal from "../modals/BillingModal";

function BillingPage(): JSX.Element {
  const { setCurrentOverlay } = useContext(Context);
  const [shouldCreate, setShouldCreate] = useState(false);

  const {
    paymentMethodList,
    refetchPaymentMethods,
    deletePaymentMethod,
    isDeleting,
  } = usePaymentMethods();
  const { setDefaultPaymentMethod } = useSetDefaultPaymentMethod();

  const { refetchPaymentEnabled } = checkIfProjectHasPayment();

  const onCreate = async () => {
    await refetchPaymentMethods();
    setShouldCreate(false);
    refetchPaymentEnabled();
  };

  if (shouldCreate) {
    return (
      <BillingModal onCreate={onCreate} back={() => setShouldCreate(false)} />
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
                  ) : !paymentMethod.is_default ? (
                    <Container row={true}>
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
                      <Spacer inline x={1} />
                      <Button
                        onClick={() => {
                          setDefaultPaymentMethod(paymentMethod.id);
                          refetchPaymentMethods();
                        }}
                      >
                        Set as default
                      </Button>
                    </Container>
                  ) : (
                    <Text>Default</Text>
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
