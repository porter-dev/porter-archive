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
import { integrationList } from "shared/common";

const ConnectRegistry: React.FC<{}> = ({}) => {
  const snap = useSnapshot(OFState);
  const { step } = useParams<any>();
  const [connectedRegistries, setConnectedRegistries] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentProvider = snap.StateHandler.connected_registry?.provider;

  const enableGoBack =
    snap.StepHandler.canGoBack && !snap.StepHandler.isSubFlow;

  useEffect(() => {
    let isSubscribed = true;
    const projectId = snap.StateHandler?.project?.id;

    if (typeof projectId === "number") {
      api
        .getProjectRegistries("<token>", {}, { id: projectId })
        .then((res) => {
          const registries = res?.data;
          if (isSubscribed) {
            if (Array.isArray(registries) && registries.length) {
              setConnectedRegistries(registries);
            }
          }
        })
        .catch((err) => {
          console.error(err);
          if (isSubscribed) {
            setConnectedRegistries(null);
          }
        })
        .finally(() => {
          if (isSubscribed) {
            setIsLoading(false);
          }
        });
    }

    return () => {
      isSubscribed = false;
    };
  }, [snap.StateHandler?.project]);

  const handleGoBack = () => {
    OFState.actions.nextStep("go_back");
  };

  const handleSkip = () => {
    OFState.actions.nextStep("skip");
  };

  const handleSelectProvider = (provider: string) => {
    provider !== "skip" && OFState.actions.nextStep("continue", provider);
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
      <TitleSection>Getting Started</TitleSection>
      <Subtitle>
        Step 2 of 3 - Connect an existing registry (Optional)
        <a
          href="https://docs.porter.run/docs/linking-up-application-source#connecting-an-existing-image-registry"
          target="_blank"
        >
          <i className="material-icons">help_outline</i>
        </a>
      </Subtitle>
      <Helper>
        {currentProvider
          ? "Link to an existing Docker registry. Don't worry if you don't know what this is."
          : "Link to an existing Docker registry or continue."}
      </Helper>
      {isLoading && <Loading />}

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

          {connectedRegistries?.length && (
            <IntegrationList>
              {connectedRegistries.map((registry: any) => {
                const icon = integrationList[registry?.service]?.icon;
                const subtitle = integrationList[registry?.service]?.label;

                return (
                  <React.Fragment key={registry.name}>
                    <Integration>
                      <MainRow disabled={false}>
                        <Flex>
                          <Icon src={icon && icon} />
                          <Description>
                            <Label>{registry?.name}</Label>
                            <IntegrationSubtitle>
                              {subtitle}
                            </IntegrationSubtitle>
                          </Description>
                        </Flex>
                        <MaterialIconTray disabled={false}>
                          <I
                            className="material-icons"
                            onClick={() => console.log("DELETE")}
                          >
                            delete
                          </I>
                        </MaterialIconTray>
                      </MainRow>
                    </Integration>
                  </React.Fragment>
                );
              })}
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

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const IntegrationList = styled.div`
  margin-top: 14px;
`;

const Integration = styled.div`
  margin-left: -2px;
  display: flex;
  flex-direction: column;
  background: #26282f;
  margin-bottom: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 15px 0px #00000055;
`;

const IntegrationSubtitle = styled.div`
  color: #aaaabb;
  font-size: 13px;
  display: flex;
  align-items: center;
  padding-top: 5px;
`;

const Icon = styled.img`
  width: 30px;
  margin-right: 18px;
`;

const I = styled.i`
  :hover {
    cursor: pointer;
  }
`;

const MainRow = styled.div`
  height: 70px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 25px;
  border-radius: 5px;
  :hover {
    background: ${(props: { disabled: boolean }) =>
      props.disabled ? "" : "#ffffff11"};
    > i {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }

  > i {
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    color: #ffffff44;
    margin-right: -7px;
    :hover {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
`;

const MaterialIconTray = styled.div`
  max-width: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  > i {
    background: #26282f;
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    margin: 0 5px;
    color: #ffffff44;
    :hover {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
`;

const Description = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
`;

const Label = styled.div`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
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
