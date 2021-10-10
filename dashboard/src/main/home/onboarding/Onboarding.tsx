import React, { useContext, useEffect } from "react";
import { useLocation } from "react-router";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import { OnboardingState } from "./OnboardingState";
import Routes from "./Routes";
import StepHandler from "./StepHandler";

const Onboarding = () => {
  const context = useContext(Context);
  const location = useLocation();
  const { pushFiltered } = useRouting();

  useEffect(() => {
    OnboardingState.actions.initFromGlobalContext(context);
  }, [context]);

  useEffect(() => {
    OnboardingState.actions.restoreState();
    return () => {
      OnboardingState.actions.clearState();
    };
  }, []);

  useEffect(() => {
    if (StepHandler.currentStep.url !== location.pathname) {
      pushFiltered(StepHandler.currentStep.url, []);
    }
  }, [location.pathname]);
  return (
    <StyledOnboarding>
      <Routes />
    </StyledOnboarding>
  );
};

export default Onboarding;

const StyledOnboarding = styled.div`
  width: calc(90% - 130px);
  min-width: 300px;
  position: relative;
  margin-top: calc(50vh - 340px);
`;
