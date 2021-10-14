import React, { useContext, useEffect } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";
import { devtools } from "valtio/utils";
import Routes from "./Routes";
import { OFState } from "./state";
import { useSteps } from "./state/StepHandler";
import { Onboarding as OnboardingSaveType } from "./types";

const Onboarding = () => {
  const context = useContext(Context);
  useSteps();

  useEffect(() => {
    let sub = devtools(OFState, "Onboarding flow state");
    return () => {
      sub();
    };
  }, []);

  const getData = async ({
    id: project_id,
    name: project_name,
  }: {
    id: number;
    name: string;
  }): Promise<OnboardingSaveType> => {
    let odata = null;

    // Get general onboarding data
    try {
      const response = await api.getOnboardingState(
        "<token>",
        {},
        { project_id: project_id }
      );

      if (response.data) {
        odata = response.data;
      }
    } catch (error) {
      return null;
    }

    let registry_connection_data = null;
    if (odata?.registry_connection_id) {
      // Get subflows data
      try {
        const response = await api.getOnboardingRegistry(
          "<token>",
          {},
          {
            project_id: project_id,
            registry_connection_id: odata.registry_connection_id,
          }
        );
        console.log(response);
        if (response.data) {
          registry_connection_data = response.data;
        }
      } catch (error) {
        console.error("Couldn't get registry connection data");
      }
    }

    let provision_connection_data = null;
    if (odata?.registry_infra_id) {
      try {
        const response = await api.getOnboardingInfra(
          "<token>",
          {},
          {
            project_id: project_id,
            registry_infra_id: odata.registry_infra_id,
          }
        );

        if (response.data) {
          provision_connection_data = response.data;
        }
      } catch (error) {
        console.error("Couldn't get infra data");
      }
    }

    return {
      project_id,
      project_name,
      ...(odata || {}),
      ...(registry_connection_data || {}),
      ...(provision_connection_data || {}),
    };
  };

  useEffect(() => {
    if (context?.currentProject?.id) {
      getData(context.currentProject).then((data) => {
        if (data) {
          OFState.actions.initializeState(data);
        }
      });
    }
    return () => {
      OFState.actions.clearState();
    };
  }, [context.currentProject?.id]);

  // useEffect(() => {
  //   if (snap.StepHandler.finishedOnboarding) {
  //     OFState.actions.clearState();
  //     pushFiltered("/dashboard", []);
  //   } else if (snap.StepHandler?.currentStep?.url !== location.pathname) {
  //     pushFiltered(snap.StepHandler.currentStep.url, []);
  //   }
  // }, [
  //   location.pathname,
  //   snap.StepHandler?.currentStep?.url,
  //   snap.StepHandler?.finishedOnboarding,
  // ]);

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
