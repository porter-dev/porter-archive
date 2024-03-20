import React, { Component, useState, useEffect } from "react";
import { loadStripe } from '@stripe/stripe-js';
import styled from "styled-components";
import {
    Elements,
} from '@stripe/react-stripe-js';
import PaymentSetupForm from "./PaymentSetupForm";
import backArrow from "assets/back_arrow.png";

const stripePromise = loadStripe(process.env.STRIPE_PUBLISHABLE_KEY || "")

const BillingModal = ({ project_id, defaultValues }) => {
    const appearance = {
        variables: {
            colorPrimary: '#aaaabb',
            colorBackground: "#27292e",
            colorText: "#fefefe",
            fontFamily: "Work Sans",
        }
    }
    const options = {
        mode: 'setup',
        currency: 'usd',
        setupFutureUsage: 'off_session',
        paymentMethodTypes: ['card'],
        appearance,
    };

    return (
        <>
            <div id="checkout">
                <BackButton>
                    <BackButtonImg src={backArrow} />
                </BackButton>
                <Elements stripe={stripePromise} options={options} appearance={appearance} defaultValues={defaultValues}>
                    <PaymentSetupForm project_id={project_id}></PaymentSetupForm>
                </Elements>
            </div>
        </>

    );
}

export default BillingModal;

const BackButton = styled.div`
  display: flex;
  width: 36px;
  cursor: pointer;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
`;
