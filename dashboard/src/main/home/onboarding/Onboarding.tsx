import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { devtools } from "valtio/utils";

import Loading from "components/Loading";
import Banner from "components/porter/Banner";
import Button from "components/porter/Button";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import ProvisionerFlow from "components/ProvisionerFlow";

import api from "shared/api";
import { Context } from "shared/Context";
import bolt from "assets/bolt.svg";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import CreateClusterForm from "../infrastructure-dashboard/forms/CreateClusterForm";
import Routes from "./Routes";
import { OFState } from "./state";
import { useSteps } from "./state/StepHandler";
import { type Onboarding as OnboardingSaveType } from "./types";

const Onboarding = () => {
  const context = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  useSteps(isLoading);

  useEffect(() => {
    const unsub = devtools(OFState, { name: "Onboarding flow state" });
    return () => {
      if (typeof unsub === "function") {
        unsub();
      }
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
        { project_id }
      );

      if (response.data) {
        odata = response.data;
      }
    } catch (error) {
      console.error(
        "Gouldn't get any previous state, going with a brand new onboarding!"
      );
    }

    let registry_connection_data = null;
    if (odata?.registry_connection_id) {
      // Get subflows data
      try {
        const response = await api.getOnboardingRegistry(
          "<token>",
          {},
          {
            project_id,
            registry_connection_id: odata.registry_connection_id,
          }
        );
        // console.log(response);
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
            project_id,
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
      ...({ registry_connection_data } || {}),
      ...({ provision_connection_data } || {}),
    };
  };

  useEffect(() => {
    if (context.currentProject) {
      getData(context.currentProject).then((data) => {
        OFState.actions.initializeState(data);
        setIsLoading(false);
      });
    }
    return () => {
      OFState.actions.clearState();
    };
  }, [context.currentProject]);

  useEffect(() => {
    if (context?.user?.email) {
      OFState.StateHandler.user_email = context.user.email;
    }
  }, [context.user]);

  const skipOnboarding = () => {
    OFState.actions.goTo("clean_up");
  };

  const checkIfUserHasClusters = async () => {
    const { setCurrentModal, currentProject } = context;

    const project_id = currentProject?.id;

    try {
      if (typeof project_id !== "number") {
        return;
      }

      const clusters = await api
        .getClusters("<token>", {}, { id: project_id })
        .then((res) => res?.data);

      const hasClusters = Array.isArray(clusters) && clusters.length;

      if (hasClusters && !context.hasFinishedOnboarding) {
        setCurrentModal("SkipOnboardingModal", { skipOnboarding });
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    checkIfUserHasClusters();
  }, [context?.currentProject?.id]);

  const renderOnboarding = () => {
    if (
      context?.currentProject?.simplified_view_enabled &&
      context?.currentProject?.capi_provisioner_enabled &&
      context?.currentProject?.beta_features_enabled
    ) {
      return <CreateClusterForm />;
    } else if (context?.currentProject?.capi_provisioner_enabled) {
      return (
        <Wrapper>
          <DashboardHeader
            image={bolt}
            title="Getting started"
            description="Select your existing cloud provider to get started with Porter."
            disableLineBreak
            capitalize={false}
          />
          <ProvisionerFlow />
          <DashboardPlaceholder>
            <Text size={16}>
              Want to test Porter without linking your own cloud account?
            </Text>
            <Spacer y={0.5} />
            <Text color={"helper"}>
              Get started with the Porter sandbox environment.
            </Text>
            <Spacer y={1} />
            <Link to="https://sandbox.porter.run">
              <Button alt height="35px">
                Deploy on the Porter sandbox <Spacer inline x={1} />{" "}
                <i className="material-icons" style={{ fontSize: "18px" }}>
                  east
                </i>
              </Button>
            </Link>
          </DashboardPlaceholder>
          <Div />
        </Wrapper>
      );
    } else {
      return (
        <StyledOnboarding>
          {isLoading ? <Loading /> : <Routes />}
        </StyledOnboarding>
      );
    }
  };

  return <>{renderOnboarding()}</>;
};

export default Onboarding;

const Div = styled.div`
  width: 100%;
  height: 100px;
`;

const Br = styled.div`
  width: 100%;
  height: 1px;
  margin-top: -1px;
`;

const Wrapper = styled.div`
  width: 100%;
`;

const ViewWrapper = styled.div`
  width: 100%;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  margin-top: -10vh;
  height: 111%;
  padding-top: 600px;
  padding-bottom: 300px;
`;

const StyledOnboarding = styled.div`
  max-width: 700px;
  width: 50%;
  z-index: 1;
  display: flex;
  align-items: center;
  margin-top: -6%;
  padding-bottom: 5%;
  min-width: 350px;
  position: relative;
`;
