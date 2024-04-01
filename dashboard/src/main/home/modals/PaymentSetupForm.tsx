import React, { useState } from "react";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import styled from "styled-components";

import Button from "components/porter/Button";
import Error from "components/porter/Error";
import Spacer from "components/porter/Spacer";
import SaveButton from "components/SaveButton";
import {
  useCreatePaymentMethod,
  useSetDefaultPaymentMethod,
} from "lib/hooks/useStripe";

const PaymentSetupForm = ({ onCreate }: { onCreate: () => Promise<void> }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const { createPaymentMethod } = useCreatePaymentMethod();
  const { setDefaultPaymentMethod } = useSetDefaultPaymentMethod();

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    // Submit form before calling the server
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setLoading(false);
      return;
    }

    // Create the setup intent in the server
    const clientSecret = await createPaymentMethod();

    // Finally, confirm with Stripe so the payment method is saved
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      clientSecret,
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    // Confirm the setup and set as default
    if (setupIntent?.payment_method !== null) {
      await setDefaultPaymentMethod(setupIntent?.payment_method as string);
    }

    onCreate();
  };

  return (
    <form>
      <PaymentElement />
      <Spacer y={1} />
      <Button disabled={!stripe || loading} onClick={handleSubmit}>
        Add payment method
      </Button>
      {errorMessage && <Error message={errorMessage}></Error>}
    </form>
  );
};

export default PaymentSetupForm;

const SubmitButton = styled(SaveButton)`
  position: initial;
`;
