import React, { useContext, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import cardIcon from "legacy/assets/credit-card.svg";
import gift from "legacy/assets/gift.svg";
import trashIcon from "legacy/assets/trash.png";
import CopyToClipboard from "legacy/components/CopyToClipboard";
import Loading from "legacy/components/Loading";
import Banner from "legacy/components/porter/Banner";
import Button from "legacy/components/porter/Button";
import Container from "legacy/components/porter/Container";
import Fieldset from "legacy/components/porter/Fieldset";
import Icon from "legacy/components/porter/Icon";
import Image from "legacy/components/porter/Image";
import Link from "legacy/components/porter/Link";
import Modal from "legacy/components/porter/Modal";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import {
  useCustomerInvoices,
  useCustomerPlan,
  usePorterCredits,
  useReferralDetails,
} from "legacy/lib/hooks/useLago";
import {
  checkIfProjectHasPayment,
  usePaymentMethods,
  useSetDefaultPaymentMethod,
} from "legacy/lib/hooks/useStripe";
import styled from "styled-components";

import { Context } from "shared/Context";

import BillingModal from "../modals/BillingModal";

dayjs.extend(relativeTime);

function BillingPage(): JSX.Element {
  const { referralDetails } = useReferralDetails();
  const { setCurrentOverlay } = useContext(Context);
  const [shouldCreate, setShouldCreate] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const { currentProject } = useContext(Context);

  const { creditGrants } = usePorterCredits();
  const { plan } = useCustomerPlan();
  const { invoiceList } = useCustomerInvoices();

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

  const onCreate = async (): Promise<void> => {
    await refetchPaymentMethods({ throwOnError: false, cancelRefetch: false });
    setShouldCreate(false);
    await refetchPaymentEnabled({ throwOnError: false, cancelRefetch: false });
  };

  const isTrialExpired = (timestamp: string): boolean => {
    if (timestamp === "") {
      return true;
    }
    const timestampDate = dayjs(timestamp);
    return timestampDate.isBefore(dayjs(new Date()));
  };

  const trialExpired = plan && isTrialExpired(plan.trial_info.ending_before);

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
      {plan?.trial_info !== undefined &&
        plan.trial_info.ending_before !== "" &&
        !trialExpired && (
          <>
            <Banner type="warning">
              Your free trial is ending{" "}
              {dayjs().to(dayjs(plan.trial_info.ending_before))}.
            </Banner>
            <Spacer y={1.5} />
          </>
        )}
      {currentProject?.metronome_enabled && currentProject?.sandbox_enabled && (
        <>
          <Text size={16}>Credit balance</Text>
          <Spacer y={1} />
          <Text color="helper">
            View the amount of Porter credits you have remaining to spend on
            resources in this project.
          </Text>
          <Spacer y={1} />
          <Container>
            <Image src={gift} style={{ marginBottom: "-2px" }} />
            <Spacer inline x={1} />
            <Text size={20}>
              {creditGrants && creditGrants.remaining_credits > 0
                ? `$${formatCredits(creditGrants.remaining_credits)}`
                : "$ 0.00"}
            </Text>
          </Container>
          <Spacer y={1} />
          <Text color="helper">
            Earn additional free credits by{" "}
            <Link
              hasunderline
              onClick={() => {
                setShowReferralModal(true);
              }}
            >
              referring users to Porter
            </Link>
            .
          </Text>
          <Spacer y={2} />
        </>
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
        alt
      >
        <I className="material-icons">add</I>
        Add payment method
      </Button>
      <Spacer y={2} />

      <Text size={16}>Invoice history</Text>
      <Spacer y={1} />
      <Text color="helper">
        View all invoices from Porter over the past 12 months.
      </Text>
      <Spacer y={1} />
      {invoiceList?.map((invoice, i) => {
        return (
          <>
            <Container row key={i}>
              <Link target="_blank" to={invoice.hosted_invoice_url}>
                {dayjs(invoice.created).format("DD/MM/YYYY")}
              </Link>
            </Container>
            <Spacer y={1} />
          </>
        );
      })}

      {showReferralModal && (
        <Modal
          closeModal={() => {
            setShowReferralModal(false);
          }}
        >
          <Text size={16}>Refer users to Porter</Text>
          <Spacer y={1} />
          <Text color="helper">
            Earn $10 in free credits for each user you refer to Porter. Referred
            users need to connect a payment method for credits to be added to
            your account.
          </Text>
          <Spacer y={1} />
          <Container row>
            <ReferralCode>
              Referral code:{" "}
              {currentProject?.referral_code ? (
                <Code>{currentProject.referral_code}</Code>
              ) : (
                "n/a"
              )}
            </ReferralCode>
            <Spacer inline x={1} />
            <CopyToClipboard
              text={
                window.location.origin +
                "/register?referral=" +
                currentProject?.referral_code
              }
              tooltip="Copied to clipboard"
            >
              <CopyButton>Copy referral link</CopyButton>
            </CopyToClipboard>
          </Container>
          <Spacer y={1} />
          <Text color="helper">
            You have referred{" "}
            {referralDetails ? referralDetails.referral_count : "?"}/
            {referralDetails?.max_allowed_referrals} users.
          </Text>
        </Modal>
      )}
    </>
  );
}

export default BillingPage;

const CopyButton = styled.div`
  cursor: pointer;
  background: #ffffff11;
  padding: 5px;
  border-radius: 5px;
  font-size: 13px;
`;

const Code = styled.span`
  font-style: italic;
`;

const ReferralCode = styled.div`
  background: linear-gradient(60deg, #4b366d 0%, #6475b9 100%);
  padding: 10px 15px;
  border-radius: 10px;
  width: fit-content;
`;

const I = styled.i`
  font-size: 16px;
  margin-right: 8px;
`;

const DeleteButton = styled.div`
  cursor: pointer;
`;

const DeleteButtonContainer = styled.div`
  text-align: center;
`;
