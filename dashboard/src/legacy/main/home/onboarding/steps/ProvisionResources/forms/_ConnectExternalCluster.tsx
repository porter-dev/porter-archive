import React, { useEffect, useState } from "react";
import styled from "styled-components";
import TabSelector from "components/TabSelector";
import api from "shared/api";
import SaveButton from "components/SaveButton";
import { integrationList } from "shared/common";
import { provisionResourcesTracks } from "shared/anayltics";

type Props = {
  nextStep: () => void;
  project: {
    id: number;
    name: string;
  };
  goBack: () => void;
};

const tabOptions = [{ label: "MacOS", value: "mac" }];

/**
 * @todo Poll the available clusters until there's at least one connected
 * to the project
 */
const ConnectExternalCluster: React.FC<Props> = ({
  nextStep,
  project,
  goBack,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [currentTab, setCurrentTab] = useState("mac");
  const [enableContinue, setEnableContinue] = useState(false);

  const getClusters = async (
    status: { isSubscribed: boolean },
    retryCount = 0
  ) => {
    try {
      api.getClusters("<token>", {}, { id: project.id }).then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          if (status.isSubscribed) {
            setEnableContinue(true);
          }
        } else {
          if (status.isSubscribed) {
            setTimeout(() => {
              getClusters(status, retryCount + 1);
            }, 1000);
          }
        }
      });
    } catch (error) {}
  };

  useEffect(() => {
    let status = { isSubscribed: true };
    getClusters(status);
    return () => {
      status.isSubscribed = false;
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 0:
        return (
          <Placeholder>
            1. To install the Porter CLI, run the following in your terminal:
            <Code>/bin/bash -c "$(curl -fsSL https://install.porter.run)"</Code>
            Alternatively, on macOS you can use Homebrew:
            <Code>brew install porter-dev/porter/porter</Code>
          </Placeholder>
        );
      case 1:
        return (
          <Placeholder>
            2. Log in to the Porter CLI:
            <Code>
              porter config set-host {location.protocol + "//" + location.host}
              <br />
              porter auth login
            </Code>
            3. Configure the Porter CLI and link your current context:
            <Code>
              porter config set-project {project.id}
              <br />
              porter connect kubeconfig
            </Code>
          </Placeholder>
        );
      case 2:
        return (
          <Placeholder>
            <Bold>Passing a kubeconfig explicitly</Bold>
            You can pass a path to a kubeconfig file explicitly via:
            <Code>
              porter connect kubeconfig --kubeconfig path/to/kubeconfig
            </Code>
            <Bold>Passing a context list</Bold>
            You can initialize Porter with a set of contexts by passing a
            context list to start. The contexts that Porter will be able to
            access are the same as kubectl config get-contexts. For example, if
            there are two contexts named minikube and staging, you could connect
            both of them via:
            <Code>
              porter connect kubeconfig --context minikube --context staging
            </Code>
          </Placeholder>
        );
      default:
        return;
    }
  };

  return (
    <Wrapper>
      <StyledClusterInstructionsModal>
        <FormHeader>
          <CloseButton onClick={() => goBack()}>
            <i className="material-icons">keyboard_backspace</i>
          </CloseButton>
          <img src={integrationList["kubernetes"].icon} />
          Link an existing cluster
        </FormHeader>
        <TabSelector
          options={tabOptions}
          currentTab={currentTab}
          setCurrentTab={(value: string) => setCurrentTab(value)}
        />

        {renderPage()}
        <PageSection>
          <PageCount>{currentPage + 1}/3</PageCount>
          <i
            className="material-icons"
            onClick={() =>
              currentPage > 0 ? setCurrentPage(currentPage - 1) : null
            }
          >
            arrow_back
          </i>
          <i
            className="material-icons"
            onClick={() =>
              currentPage < 2 ? setCurrentPage(currentPage + 1) : null
            }
          >
            arrow_forward
          </i>
        </PageSection>
      </StyledClusterInstructionsModal>
      <NextStep
        text="Continue"
        disabled={!enableContinue}
        onClick={() => {
          provisionResourcesTracks.trackExternalClusterConnected();
          nextStep();
        }}
        status={
          !enableContinue ? "No connected cluster detected" : "successful"
        }
        makeFlush={true}
        clearPosition={true}
        statusPosition="right"
        saveText=""
      />
    </Wrapper>
  );
};

export default ConnectExternalCluster;

const Wrapper = styled.div``;

const CloseButton = styled.div`
  width: 30px;
  height: 30px;
  margin-left: -5px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  border-radius: 50%;
  right: 10px;
  top: 10px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }

  > i {
    font-size: 20px;
    color: #aaaabb;
  }
`;

const FormHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  font-size: 13px;
  margin-top: -2px;
  font-weight: 500;

  > img {
    height: 18px;
    margin-right: 12px;
  }
`;

const NextStep = styled(SaveButton)`
  margin-top: 25px;
`;

const PageCount = styled.div`
  margin-right: 9px;
  user-select: none;
  letter-spacing: 2px;
`;

const PageSection = styled.div`
  position: absolute;
  bottom: 12px;
  right: 15px;
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #ffffff;
  justify-content: flex-end;
  user-select: none;

  > i {
    font-size: 18px;
    margin-left: 2px;
    cursor: pointer;
    border-radius: 20px;
    padding: 5px;
    :hover {
      background: #ffffff11;
    }
  }
`;

const Code = styled.div`
  background: #181b21;
  padding: 10px 15px;
  border: 1px solid #ffffff44;
  border-radius: 5px;
  margin: 10px 0px 15px;
  color: #ffffff;
  font-size: 13px;
  user-select: text;
  line-height: 1em;
  font-family: monospace;
`;

const A = styled.a`
  color: #ffffff;
  text-decoration: underline;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
`;

const Placeholder = styled.div`
  color: #aaaabb;
  font-size: 13px;
  margin-left: 0px;
  margin-top: 25px;
  line-height: 1.6em;
  width: 550px;
  user-select: none;
`;

const Bold = styled.div`
  font-weight: 600;
  margin-bottom: 7px;
`;

const Subtitle = styled.div`
  padding: 17px 0px 25px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  margin-top: 3px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const ModalTitle = styled.div`
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: Work Sans, sans-serif;
  font-size: 18px;
  color: #ffffff;
  user-select: none;
  font-weight: 700;
  align-items: center;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const StyledClusterInstructionsModal = styled.div`
  width: 100%;
  padding: 20px 20px 35px;
  border-radius: 5px;
  overflow: hidden;
  position: relative;
  background: #ffffff0a;
  border: 1px solid #ffffff55;
`;
