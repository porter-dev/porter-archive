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
  useCustomerPlan,
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

  const { creditGrants } = usePorterCredits();
  const { plan } = useCustomerPlan();

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

  const monthDiff = (d1: Date, d2: Date) => {
    var months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
  };

  const daysDiff = (d1: Date, d2: Date) => {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
  };

  const relativeTime = (timestampUTC: string): string => {
    const tsDate = new Date(timestampUTC);
    const now = new Date();

    const remainingMonths = monthDiff(now, tsDate);
    const remainingDays = daysDiff(now, tsDate);

    const relativeFormat = remainingMonths > 0 ? "months" : "days";
    const relativeValue = remainingMonths > 0 ? remainingMonths : remainingDays;

    const rt = new Intl.RelativeTimeFormat("en", { style: "short" });
    return rt.format(relativeValue, relativeFormat);
  };

  const readableDate = (s: string) => new Date(s).toLocaleDateString();

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
          <div>
            <Text size={16}>Porter credit grants</Text>
            <Spacer y={1} />
            <Text color="helper">
              View the amount of Porter credits you have available to spend on
              resources within this project.
            </Text>
            <Spacer y={1} />

            <Container>
              <Image src={gift} style={{ marginTop: "-2px" }} />
              <Spacer inline x={1} />
              <Text size={20}>
                {creditGrants !== undefined &&
                creditGrants.remaining_credits > 0
                  ? `$${formatCredits(
                      creditGrants.remaining_credits
                    )}/$${formatCredits(creditGrants.granted_credits)}`
                  : "$ 0.00"}
              </Text>
            </Container>
            <Spacer y={2} />
          </div>

          <div>
            <Text size={16}>Plan Details</Text>
            <Spacer y={1} />
            <Text color="helper">
              View the details of the current billing plan of this project.
            </Text>
            <Spacer y={1} />

            <Text>Active Plan</Text>
            <Spacer y={0.5} />
            {plan !== undefined ? (
              <Fieldset>
                <Container row spaced>
                  <Container row>
                    <Text color="helper">{plan.plan_name}</Text>
                  </Container>
                  <Container row>
                    {plan.trial_info !== undefined ? (
                      <Text>
                        Free trial ends{" "}
                        {relativeTime(plan.trial_info.ending_before)}
                      </Text>
                    ) : (
                      <Text>Started on {readableDate(plan.starting_on)}</Text>
                    )}
                  </Container>
                </Container>
              </Fieldset>
            ) : (
              <Loading></Loading>
            )}
            <Spacer y={1} />
          </div>

          <Text size={16}>Usage</Text>
          <Spacer y={1} />
          <iframe
            src={usageDashboard}
            scrolling="no"
            frameBorder={0}
            allowTransparency={true}
            style={{
              width: "100%",
              height: "80vh",
              overflowY: "hidden",
              border: "none",
              backgroundColor: "#121212",
            }}
          ></iframe>
          <Spacer y={1} />

          <div>
            {plan === undefined ? (
              <Loading></Loading>
            ) : (
              <Fieldset>
                <Container row>
                  <Text size={14}>{plan.plan_name}</Text>
                </Container>
                {plan.trial_info !== undefined ? (
                  <div>
                    <Text size={13}>
                      Trial Ending {relativeTime(plan.trial_info.ending_before)}
                    </Text>
                  </div>
                ) : (
                  <div></div>
                )}
              </Fieldset>
            )}
          </div>
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
