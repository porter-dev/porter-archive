import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Fieldset from "components/porter/Fieldset";
import Icon from "components/porter/Icon";
import Image from "components/porter/Image";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import {
  checkIfProjectHasPayment,
  usePaymentMethods,
  usePorterCredits,
  useSetDefaultPaymentMethod,
} from "lib/hooks/useStripe";

import { Context } from "shared/Context";
import cardIcon from "assets/credit-card.svg";
import gift from "assets/gift.svg";
import trashIcon from "assets/trash.png";

import BillingModal from "../modals/BillingModal";

function BillingPage(): JSX.Element {
  const { setCurrentOverlay } = useContext(Context);
  const [shouldCreate, setShouldCreate] = useState(false);
  const { currentProject } = useContext(Context);

  const { credits } = usePorterCredits();

  const {
    paymentMethodList,
    refetchPaymentMethods,
    deletePaymentMethod,
    deletingIds,
  } = usePaymentMethods();
  const { setDefaultPaymentMethod } = useSetDefaultPaymentMethod();

  const { refetchPaymentEnabled } = checkIfProjectHasPayment();

  const formatCredits = (credits: number): string => {
    return (credits / 100).toFixed(2);
  };

  const onCreate = async () => {
    await refetchPaymentMethods();
    setShouldCreate(false);
    refetchPaymentEnabled();
  };

  if (shouldCreate) {
    return (
      <BillingModal
        onCreate={onCreate}
        back={() => {
          setShouldCreate(false);
        }}
      />
    );
  }

  return (
    <>
      {currentProject?.metronome_enabled ? (
        <div>
          <Text size={16}>Porter credit balance</Text>
          <Spacer y={1} />
          <Text color="helper">
            View the amount of Porter credits you have available to spend on
            resources within this project.
          </Text>
          <Spacer y={1} />
          <Container row>
            <Image src={gift} style={{ marginTop: "-2px" }} />
            <Spacer inline x={1} />
            <Text size={20}>
              {credits > 0 ? `$${formatCredits(credits)}` : "$ 0.00"}
            </Text>
          </Container>
          <Spacer y={2} />
        </div>
      ) : (
        <div></div>
      )}
      <Text size={16}>Payment methods</Text>
      <Spacer y={1} />
      <Text color="helper">
        Manage the payment methods associated with this project.
      </Text>
      <Spacer y={1} />
      {paymentMethodList.map((paymentMethod, idx) => {
        return (
          <div key={idx}>
            <Fieldset>
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
                  {deletingIds.includes(paymentMethod.id) ? (
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
          </div>
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
