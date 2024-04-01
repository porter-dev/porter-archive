import React from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import Link from "components/porter/Link";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { checkBillingCustomerExists } from "lib/hooks/useStripe";

import PaymentSetupForm from "./PaymentSetupForm";

const BillingModal = ({
  back,
  onCreate,
}: {
  back: (value: React.SetStateAction<boolean>) => void;
  onCreate: () => Promise<void>;
}) => {
  const { publishableKey } = checkBillingCustomerExists();
  const stripePromise = loadStripe(publishableKey);

  const appearance = {
    variables: {
      colorPrimary: "#aaaabb",
      colorBackground: "#27292e",
      colorText: "#fefefe",
      fontFamily: "Work Sans",
    },
  };
  const options = {
    mode: "setup",
    currency: "usd",
    setupFutureUsage: "off_session",
    paymentMethodTypes: ["card"],
    appearance,
    fonts: [
      {
        cssSrc: "https://fonts.googleapis.com/css?family=Work+Sans",
      },
    ],
  };

  return (
    <Modal closeModal={back}>
      <div id="checkout">
        <Text size={16}>Add payment method</Text>
        <Spacer y={1} />
        <Text color="helper">
          <Text style={{ fontWeight: 500 }}>
            You will not be charged until you have an app deployed and have run
            out of credits.
          </Text>{" "}
          A payment method is required to begin deploying applications on
          Porter. You can learn more about our pricing{" "}
          <Link target="_blank" to="https://porter.run/pricing">
            here
          </Link>
        </Text>
        <Spacer y={1} />
        <Elements
          stripe={stripePromise}
          options={options}
          appearance={appearance}
        >
          <PaymentSetupForm onCreate={onCreate}></PaymentSetupForm>
        </Elements>
      </div>
    </Modal>
  );
};

export default BillingModal;
