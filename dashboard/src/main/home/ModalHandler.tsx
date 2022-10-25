import React, { useContext, useEffect, useState } from "react";
import useAuth from "shared/auth/useAuth";
import { Context } from "shared/Context";
import Modal from "./modals/Modal";
import ClusterInstructionsModal from "./modals/ClusterInstructionsModal";
import IntegrationsInstructionsModal from "./modals/IntegrationsInstructionsModal";
import IntegrationsModal from "./modals/IntegrationsModal";
import PreviewEnvSettingsModal from "./modals/PreviewEnvSettingsModal";
import UpdateClusterModal from "./modals/UpdateClusterModal";
import NamespaceModal from "./modals/NamespaceModal";
import DeleteNamespaceModal from "./modals/DeleteNamespaceModal";
import EditInviteOrCollaboratorModal from "./modals/EditInviteOrCollaboratorModal";
import AccountSettingsModal from "./modals/AccountSettingsModal";
import RedirectToOnboardingModal from "./modals/RedirectToOnboardingModal";

import UsageWarningModal from "./modals/UsageWarningModal";
import api from "shared/api";
import { AxiosError } from "axios";
import SkipOnboardingModal from "./modals/SkipProvisioningModal";
import ConnectToDatabaseInstructionsModal from "./modals/ConnectToDatabaseInstructionsModal";

const ModalHandler: React.FC<{
  setRefreshClusters: (x: boolean) => void;
}> = ({ setRefreshClusters }) => {
  const [isAuth] = useAuth();
  const {
    currentModal,
    setCurrentModal,
    currentProject,
    setHasFinishedOnboarding,
  } = useContext(Context);

  const [modal, setModal] = useState("");

  useEffect(() => {
    const projectOnboarding = localStorage.getItem(
      `onboarding-${currentProject?.id}`
    );
    const parsedProjectOnboarding = JSON.parse(projectOnboarding);
    if (parsedProjectOnboarding?.StepHandler?.finishedOnboarding === false) {
      setCurrentModal("RedirectToOnboarding");
    }
  }, [currentProject?.id]);

  const checkOnboarding = async () => {
    try {
      const project_id = currentProject?.id;
      const res = await api.getOnboardingState("<token>", {}, { project_id });

      if (res?.data && res?.data.current_step !== "clean_up") {
        return {
          finished: false,
        };
      } else {
        return {
          finished: true,
        };
      }
    } catch (error) {
      const err: AxiosError = error;
      if (err.response.status === 404) {
        return {
          finished: true,
        };
      }
    }
  };

  useEffect(() => {
    if (currentModal === "RedirectToOnboardingModal") {
      if (currentProject?.id) {
        checkOnboarding().then((status) => {
          if (status?.finished) {
            setCurrentModal(null, null);
            setHasFinishedOnboarding(true);
          } else {
            setHasFinishedOnboarding(false);
            setModal("RedirectToOnboardingModal");
          }
        });
      }
    } else {
      setModal(currentModal);
    }
  }, [currentModal, currentProject]);

  return (
    <>
      {modal === "RedirectToOnboardingModal" && (
        <Modal width="600px" height="180px" title="You're almost ready...">
          <RedirectToOnboardingModal />
        </Modal>
      )}

      {modal === "ClusterInstructionsModal" && (
        <Modal
          onRequestClose={() => setCurrentModal(null, null)}
          width="760px"
          height="650px"
          title="Connecting to an Existing Cluster"
        >
          <ClusterInstructionsModal />
        </Modal>
      )}

      {/* We should be careful, as this component is named Update but is for deletion */}
      {isAuth("cluster", "", ["get", "delete"]) &&
        modal === "UpdateClusterModal" && (
          <Modal
            onRequestClose={() => setCurrentModal(null, null)}
            width="565px"
            height="275px"
            title="Cluster Settings"
          >
            <UpdateClusterModal
              setRefreshClusters={(x: boolean) => setRefreshClusters(x)}
            />
          </Modal>
        )}
      {modal === "IntegrationsModal" && (
        <Modal
          onRequestClose={() => setCurrentModal(null, null)}
          width="760px"
          height="380px"
          title="Add a New Integration"
        >
          <IntegrationsModal />
        </Modal>
      )}
      {modal === "IntegrationsInstructionsModal" && (
        <Modal
          onRequestClose={() => setCurrentModal(null, null)}
          width="760px"
          height="650px"
          title="Connecting to an Image Registry"
        >
          <IntegrationsInstructionsModal />
        </Modal>
      )}
      {isAuth("namespace", "", ["get", "create"]) &&
        modal === "NamespaceModal" && (
          <Modal
            onRequestClose={() => setCurrentModal(null, null)}
            width="600px"
            height="220px"
            title="Add namespace"
          >
            <NamespaceModal />
          </Modal>
        )}
      {isAuth("namespace", "", ["get", "delete"]) &&
        modal === "DeleteNamespaceModal" && (
          <Modal
            onRequestClose={() => setCurrentModal(null, null)}
            width="700px"
            height="280px"
            title="Delete Namespace"
          >
            <DeleteNamespaceModal />
          </Modal>
        )}

      {modal === "EditInviteOrCollaboratorModal" && (
        <Modal
          onRequestClose={() => setCurrentModal(null, null)}
          width="600px"
          height="250px"
        >
          <EditInviteOrCollaboratorModal />
        </Modal>
      )}
      {modal === "AccountSettingsModal" && (
        <Modal
          onRequestClose={() => setCurrentModal(null, null)}
          width="760px"
          height="440px"
          title="Account Settings"
        >
          <AccountSettingsModal />
        </Modal>
      )}

      {modal === "PreviewEnvSettingsModal" && (
        <Modal
          onRequestClose={() => setCurrentModal(null, null)}
          width="760px"
          height="440px"
          title="Preview Environment Settings"
        >
          <PreviewEnvSettingsModal />
        </Modal>
      )}

      {modal === "UsageWarningModal" && (
        <Modal
          onRequestClose={() => setCurrentModal(null, null)}
          width="760px"
          height="530px"
          title="Usage Warning"
        >
          <UsageWarningModal />
        </Modal>
      )}

      {modal === "SkipOnboardingModal" && (
        <Modal
          onRequestClose={() => setCurrentModal(null, null)}
          width="600px"
          height="240px"
          title="Would you like to skip project setup?"
        >
          <SkipOnboardingModal />
        </Modal>
      )}
      {modal === "ConnectToDatabaseInstructionsModal" && (
        <Modal
          onRequestClose={() => setCurrentModal(null, null)}
          width="600px"
          height="350px"
          title="Connecting to the Database"
        >
          <ConnectToDatabaseInstructionsModal />
        </Modal>
      )}
    </>
  );
};

export default ModalHandler;
