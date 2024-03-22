import React from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import styled from "styled-components";

import Heading from "components/form-components/Heading";

import backArrow from "assets/back_arrow.png";

import PaymentSetupForm from "./PaymentSetupForm";

const stripePromise = loadStripe(process.env.STRIPE_PUBLISHABLE_KEY || "");

const BillingModal = ({ back, onCreate }) => {
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
    <>
      <div id="checkout">
        <ControlRow>
          <Heading isAtTop={true}>Add Payment Method</Heading>
          <BackButton onClick={back}>
            <BackButtonImg src={backArrow} />
          </BackButton>
        </ControlRow>
        <Elements
          stripe={stripePromise}
          options={options}
          appearance={appearance}
        >
          <PaymentSetupForm onCreate={onCreate}></PaymentSetupForm>
        </Elements>
      </div>
    </>
  );
};

export default BillingModal;

const ControlRow = styled.div`
  width: 100%;
  display: flex;
  margin-left: auto;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
`;

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
