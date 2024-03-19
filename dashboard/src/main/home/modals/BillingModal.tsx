import React, { Component, useState, useEffect } from "react";
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
} from '@stripe/react-stripe-js';
import PaymentSetupForm from "./PaymentSetupForm";
import api from "shared/api";

const stripePromise = loadStripe("")

const BillingModal = () => {
    const [paymentMethods, setPaymentMethods] = useState([]);

    useEffect(() => {
        api.listPaymentMethod("{}", {}, {}).then((resp) => {
            console.log(resp)
            setPaymentMethods(resp.data)
        })
    }, [])

    const options = {
        mode: 'setup',
        currency: 'usd',
        setupFutureUsage: 'off_session',
        paymentMethodTypes: ['card'],
    };

    return (
        <>
            {
                paymentMethods.length > 0 ?
                    (
                        <div>Available payment methods</div>
                    ) :
                    (
                        <div id="checkout">
                            <Elements stripe={stripePromise} options={options}>
                                <PaymentSetupForm></PaymentSetupForm>
                            </Elements>
                        </div>
                    )
            }
        </>

    );
}

export default BillingModal;