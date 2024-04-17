import React, { useContext, useMemo, useState } from "react";
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
  useCustomerUsage,
  usePaymentMethods,
  usePorterCredits,
  useSetDefaultPaymentMethod,
} from "lib/hooks/useStripe";
import { relativeDate } from "shared/string_utils";

import { Context } from "shared/Context";
import cardIcon from "assets/credit-card.svg";
import gift from "assets/gift.svg";
import trashIcon from "assets/trash.png";

import BillingModal from "../modals/BillingModal";
import Bars from "./Bars";

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

  const { usage } = useCustomerUsage("day", true);

  const processedData = useMemo(() => {
    const before = usage;
    const resultMap = new Map();

    before?.forEach(
      (metric: {
        metric_name: string;
        usage_metrics: Array<{ starting_on: string; value: number }>;
      }) => {
        const metricName = metric.metric_name.toLowerCase().replace(" ", "_");
        metric.usage_metrics.forEach(({ starting_on, value }) => {
          if (resultMap.has(starting_on)) {
            resultMap.get(starting_on)[metricName] = value;
          } else {
            resultMap.set(starting_on, {
              starting_on: new Date(starting_on).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              [metricName]: value,
            });
          }
        });
      }
    );

    // Convert the map to an array of values
    const x = Array.from(resultMap.values());
    return x;
  }, [usage]);

  const formatCredits = (credits: number): string => {
    return (credits / 100).toFixed(2);
  };

  const readableDate = (s: string): string => new Date(s).toLocaleDateString();

  const onCreate = async (): Promise<void> => {
    await refetchPaymentMethods({ throwOnError: false, cancelRefetch: false });
    setShouldCreate(false);
    await refetchPaymentEnabled({ throwOnError: false, cancelRefetch: false });
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
      <Text size={16}>Payment methods</Text>
      <Spacer y={1} />
      <Text color="helper">
        Manage the payment methods associated with this project.
      </Text>
      <Spacer y={1} />
      {paymentMethodList.map((paymentMethod, idx) => {
        return (
          <div key={idx}>
            <Fieldset row>
              <Container row spaced>
                <Container row>
                  <Icon opacity={0.5} src={cardIcon} height={"14px"} />
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
                          if (setCurrentOverlay) {
                            setCurrentOverlay({
                              message: `Are you sure you want to remove this payment method?`,
                              onYes: async () => {
                                await deletePaymentMethod(paymentMethod.id);
                                setCurrentOverlay(null);
                              },
                              onNo: () => {
                                setCurrentOverlay(null);
                              },
                            });
                          }
                        }}
                      >
                        <Icon src={trashIcon} height={"18px"} />
                      </DeleteButton>
                      <Spacer inline x={1} />
                      <Button
                        onClick={async () => {
                          await setDefaultPaymentMethod(paymentMethod.id);
                          await refetchPaymentMethods({
                            throwOnError: false,
                            cancelRefetch: false,
                          });
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
      <Spacer y={2} />

      {currentProject?.metronome_enabled && (
        <div>

          {currentProject?.sandbox_enabled && (
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
          )}

          <div>
            <Text size={16}>Plan Details</Text>
            <Spacer y={1} />
            <Text color="helper">
              View the details of the current billing plan of this project.
            </Text>
            <Spacer y={1} />

            {plan && plan.plan_name !== "" ? (
              <div>
                <Text>Active Plan</Text>
                <Spacer y={0.5} />
                <Fieldset row>
                  <Container row spaced>
                    <Container row>
                      <Text color="helper">{plan.plan_name}</Text>
                    </Container>
                    <Container row>
                      {plan.trial_info !== undefined &&
                        plan.trial_info.ending_before !== "" ? (
                        <Text>
                          Free trial ends{" "}
                          {relativeDate(plan.trial_info.ending_before, true)}
                        </Text>
                      ) : (
                        <Text>Started on {readableDate(plan.starting_on)}</Text>
                      )}
                    </Container>
                  </Container>
                </Fieldset>
                <Spacer y={2} />
                <Text size={16}>Current Usage</Text>
                <Spacer y={1} />
                <Text color="helper">
                  View the current usage of this billing period.
                </Text>
                <Spacer y={1} />
                {usage?.length &&
                  usage.length > 0 &&
                  usage[0].usage_metrics.length > 0 ? (
                  <Flex>
                    <BarWrapper>
                      <Bars
                        title="GiB Hours"
                        fill="#8784D2"
                        yKey="gib_hours"
                        xKey="starting_on"
                        data={processedData}
                      />
                    </BarWrapper>
                    <Spacer x={1} inline />
                    <BarWrapper>
                      <Bars
                        title="CPU Hours"
                        fill="#5886E0"
                        yKey="cpu_hours"
                        xKey="starting_on"
                        data={processedData}
                      />
                    </BarWrapper>
                  </Flex>
                ) : (
                  <Fieldset>
                    <Text color="helper">
                      No usage data available for this billing period.
                    </Text>
                  </Fieldset>
                )}
                <Spacer y={2} />
              </div>
            ) : (
              <Text>This project does not have an active billing plan.</Text>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default BillingPage;

const Flex = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const BarWrapper = styled.div`
  flex: 1;
  height: 300px;
  min-width: 450px;
`;

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
