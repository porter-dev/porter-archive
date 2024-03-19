import React, { Component, useState, useEffect } from "react";
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
} from '@stripe/react-stripe-js';
import PaymentSetupForm from "./PaymentSetupForm";

const stripePromise = loadStripe('');

const BillingModal = () => {
    const options = {
        mode: 'setup',
        currency: 'usd',
        setupFutureUsage: 'off_session',
        paymentMethodTypes: ['card'],
    };

    return (
        <>
            <div id="checkout">
                <Elements stripe={stripePromise} options={options}>
                    <PaymentSetupForm></PaymentSetupForm>
                </Elements>
            </div>
        </>

    );
}

export default BillingModal;