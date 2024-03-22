import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import api from 'shared/api';
import SaveButton from "components/SaveButton";
import styled from "styled-components";
import Error from "components/porter/Error";

const PaymentSetupForm = ({ projectId, onCreate }: { projectId: number, onCreate: () => void, }) => {
    const stripe = useStripe();
    const elements = useElements();

    const [errorMessage, setErrorMessage] = useState(null);
    const [loading, setLoading] = useState(false);

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
        const resp = await api
            .addPaymentMethod("<token>", {}, { project_id: projectId })

        // Finally, confirm with Stripe so the payment method is saved
        const clientSecret = resp.data;
        const { error } = await stripe.confirmSetup({
            elements,
            clientSecret,
            redirect: "if_required",
        });

        if (error) {
            setErrorMessage(error.message);
        }

        onCreate()
    };

    return (
        <form>
            <PaymentElement />
            <SubmitButton className='submit-button' text={"Add Payment Method"} disabled={!stripe || loading} onClick={handleSubmit}>
            </SubmitButton>
            {errorMessage && <Error message={errorMessage}></Error>}
        </form>
    )
};

export default PaymentSetupForm;

const SubmitButton = styled(SaveButton)`
  position: initial;
`;
