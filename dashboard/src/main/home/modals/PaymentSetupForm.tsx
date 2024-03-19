import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import api from 'shared/api';

const PaymentSetupForm = () => {
    const stripe = useStripe();
    const elements = useElements();

    const [errorMessage, setErrorMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return null;
        }

        setLoading(true);

        // Submit form before calling the server
        const { error: submitError } = await elements.submit();
        if (submitError) {
            handleError(submitError);
            return;
        }

        // Create the setup intent in the server
        const resp = await api
            .addPaymentMethod("<token>", {}, {})

        // Finally, confirm with Stripe so the payment method is saved
        const clientSecret = resp.data.clientSecret;
        const { error } = await stripe.confirmSetup({
            elements,
            clientSecret,
            redirect: "if_required",
        });

        if (error) {
            setErrorMessage(error.message);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement />
            <button disabled={!stripe || loading}>Submit</button>
            {errorMessage && <div>{errorMessage}</div>}
        </form>
    )
};

export default PaymentSetupForm;