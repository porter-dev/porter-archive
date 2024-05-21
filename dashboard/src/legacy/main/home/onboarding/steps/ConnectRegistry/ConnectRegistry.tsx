import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import TitleSection from "components/TitleSection";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";

import styled from "styled-components";
import ProviderSelector, {
  registryOptions,
} from "../../components/ProviderSelector";
import backArrow from "assets/back_arrow.png";

import FormFlowWrapper from "./forms/FormFlow";
import { OFState } from "../../state";
import { useSnapshot } from "valtio";
import api from "shared/api";
import Loading from "components/Loading";
import Registry from "./components/Registry";
import { connectRegistryTracks } from "shared/anayltics";
import DocsHelper from "components/DocsHelper";

const ConnectRegistry: React.FC<{}> = ({}) => {
  const snap = useSnapshot(OFState);
  const { step } = useParams<any>();
  const [connectedRegistries, setConnectedRegistries] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentProvider = snap.StateHandler.connected_registry?.provider;

  const enableGoBack =
    snap.StepHandler.canGoBack && !snap.StepHandler.isSubFlow;

  useEffect(() => {
    let hookState = { isSubscribed: true };

    getRegistries(hookState);

    return () => {
      hookState.isSubscribed = false;
    };
  }, [snap.StateHandler?.project]);

  const getRegistries = async (
    props: { isSubscribed: boolean } = { isSubscribed: true }
  ) => {
    const projectId = snap.StateHandler?.project?.id;

    if (typeof projectId !== "number") {
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.getProjectRegistries(
        "<token>",
        {},
        { id: projectId }
      );
      const registries = res?.data;
      if (props.isSubscribed) {
        if (Array.isArray(registries)) {
          setConnectedRegistries(registries);
        }
      }
    } catch (error) {
      console.error(error);
      if (props.isSubscribed) {
        setConnectedRegistries(null);
      }
    } finally {
      if (props.isSubscribed) {
        setIsLoading(false);
      }
    }
  };

  const handleGoBack = () => {
    OFState.actions.nextStep("go_back");
  };

  const handleSkip = () => {
    connectRegistryTracks.trackSkipRegistryConnection();
    OFState.actions.nextStep("skip");
  };

  const handleSelectProvider = (provider: string) => {
    if (provider !== "skip") {
      connectRegistryTracks.trackConnectRegistryIntent({ provider });
      OFState.actions.nextStep("continue", provider);
    }
  };

  const handleContinueWithCurrent = () => {
    const connectedRegistry = connectedRegistries[0];
    OFState.actions.nextStep("continue_with_current", connectedRegistry);
  };

  const selectorOptions = useMemo(() => {
    const options = [...registryOptions];
    if (Array.isArray(connectedRegistries) && connectedRegistries.length) {
      const newOptions = options.filter((o) => o.value !== "skip");
      return [
        {
          value: "use_current",
          label: "Continue with current",
          icon: "",
        },
        ...newOptions,
      ];
    }
    return options;
  }, [connectedRegistries]);

  return (
    <Div>
      {enableGoBack && (
        <BackButton
          onClick={() => {
            handleGoBack();
          }}
        >
          <BackButtonImg src={backArrow} />
        </BackButton>
      )}
      <TitleSection>Getting started</TitleSection>
      <Subtitle>
        Step 2 of 3 - Connect an existing registry (optional)
        <DocsHelper
          tooltipText="If you already have an existing image registry, you can connect your existing registry during project creation. If you don't have an image registry or don't know what that means, skip this step. Porter will handle the rest."
          link={
            "https://docs.porter.run/getting-started/linking-application-source#connecting-an-existing-image-registry"
          }
        />
      </Subtitle>
      <Helper>
        {currentProvider
          ? "Link to an existing Docker registry. Don't worry if you don't know what this is."
          : "Link to an existing Docker registry or continue."}
      </Helper>

      {!isLoading && step ? (
        <FormFlowWrapper currentStep={step} />
      ) : (
        <>
          <ProviderSelector
            defaultOption={
              Array.isArray(connectedRegistries) && connectedRegistries.length
                ? "use_current"
                : "skip"
            }
            selectProvider={(provider) => {
              if (provider !== "external") {
                handleSelectProvider(provider);
              }
            }}
            options={selectorOptions}
          />
          {isLoading && <Loading />}

          {!!connectedRegistries?.length && (
            <IntegrationList>
              {connectedRegistries.map((registry: any) => (
                <Registry
                  key={registry.name}
                  registry={registry}
                  onDelete={getRegistries}
                />
              ))}
            </IntegrationList>
          )}
          <NextStep
            text="Continue"
            disabled={false}
            onClick={() => {
              if (
                Array.isArray(connectedRegistries) &&
                connectedRegistries.length
              ) {
                handleContinueWithCurrent();
              } else {
                handleSkip();
              }
            }}
            status={""}
            makeFlush={true}
            clearPosition={true}
            statusPosition="right"
            saveText=""
          />
        </>
      )}
    </Div>
  );
};

export default ConnectRegistry;

const IntegrationList = styled.div`
  margin-top: 14px;
`;

const Div = styled.div`
  width: 100%;
`;

const Subtitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  margin-top: 16px;

  display: flex;
  align-items: center;
  > a {
    > i {
      font-size: 18px;
      margin-left: 10px;
      margin-top: 1px;
      color: #8590ff;
      :hover {
        color: #aaaabb;
      }
    }
  }
`;

const NextStep = styled(SaveButton)`
  margin-top: 24px;
`;

const BackButton = styled.div`
  margin-bottom: 24px;
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
