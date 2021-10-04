import React, { useContext, useEffect } from "react";
import { Context } from "shared/Context";
import { actions } from "./OnboardingState";
import Routes from "./Routes";

const Onboarding = () => {
  const context = useContext(Context);

  useEffect(() => {
    actions.initFromGlobalContext(context);
  }, [context]);

  return <Routes />;
};

export default Onboarding;
