import React, { useContext } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import Link from "components/porter/Link";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useIntercom } from "lib/hooks/useIntercom";
import { usePublishableKey } from "lib/hooks/useStripe";

import { Context } from "shared/Context";

import PaymentSetupForm from "./PaymentSetupForm";

const BillingModal = ({
  back,
  onCreate,
  trialExpired,
}: {
  back?: (value: React.SetStateAction<boolean>) => void;
  onCreate: () => Promise<void>;
  trialExpired?: boolean;
}): JSX.Element => {
  const { currentProject } = useContext(Context);
  const { publishableKey } = usePublishableKey();

  const { showIntercomWithMessage } = useIntercom();

  let stripePromise;
  if (publishableKey) {
    stripePromise = loadStripe(publishableKey);
  }

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
        <Text size={16}>
          {trialExpired
            ? "Your Porter trial has expired"
            : "Add payment method"}
        </Text>
        <Spacer y={1} />
        {currentProject?.sandbox_enabled ? (
          <Text color="helper">
            <Text style={{ fontWeight: 500 }}>
              You will not be charged until you have an app deployed and have
              run out of credits.
            </Text>{" "}
            A payment method is required to begin deploying applications on
            Porter. You can learn more about our pricing{" "}
            <Link target="_blank" to="https://porter.run/pricing">
              here
            </Link>
          </Text>
        ) : (
          <Text color="helper">
            {trialExpired ? (
              <div>
                Your applications will continue to run but you will not be able
                to access your project until you link a payment method.{" "}
                <Text
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    { showIntercomWithMessage({
                      message: "I have already redeemed my startup deal.",
                      delaySeconds: 0,
                    }); }
                  }
                >
                  Already redeemed your startup deal?
                </Text>
                {/* <Spacer y={0.5} /> */}
                {/* {"For more details on the current costs and usage of this project, visit the "}
                  <Link to="/project-settings?selected_tab=billing">billing page.</Link> */}
              </div>
            ) : (
              "Link a payment method to your Porter project."
            )}
            <Spacer y={0.5} />
            {`You can learn more about our pricing under "For Businesses" `}
            <Link target="_blank" to="https://porter.run/pricing">
              here
            </Link>
          </Text>
        )}
        <Spacer y={1} />
        {publishableKey ? (
          <Elements
            stripe={stripePromise || null}
            options={options}
            appearance={appearance}
          >
            <PaymentSetupForm onCreate={onCreate}></PaymentSetupForm>
          </Elements>
        ) : null}
      </div>
    </Modal>
  );
};

export default BillingModal;
