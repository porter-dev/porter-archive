import React, { useContext, useEffect } from "react";
import useAuth from "shared/auth/useAuth";
import { Context } from "shared/Context";
import Modal from "./modals/Modal";
import ClusterInstructionsModal from "./modals/ClusterInstructionsModal";
import IntegrationsInstructionsModal from "./modals/IntegrationsInstructionsModal";
import IntegrationsModal from "./modals/IntegrationsModal";
import UpdateClusterModal from "./modals/UpdateClusterModal";
import NamespaceModal from "./modals/NamespaceModal";
import DeleteNamespaceModal from "./modals/DeleteNamespaceModal";
import EditInviteOrCollaboratorModal from "./modals/EditInviteOrCollaboratorModal";
import AccountSettingsModal from "./modals/AccountSettingsModal";

const ModalHandler: React.FC<{
  setRefreshClusters: (x: boolean) => void;
}> = ({ setRefreshClusters }) => {
  const [isAuth] = useAuth();
  const { currentModal, setCurrentModal, currentProject } = useContext(Context);

  useEffect(() => {
    const projectOnboarding = localStorage.getItem(
      `onboarding-${currentProject?.id}`
    );
    const parsedProjectOnboarding = JSON.parse(projectOnboarding);
    if (parsedProjectOnboarding?.StepHandler?.finishedOnboarding === false) {
      setCurrentModal("RedirectToOnboarding");
    }
  }, [currentProject?.id]);

  return (
    <>
      {currentModal === "RedirectToOnboarding" && (
        <a href="/onboarding/new-project"></a>
      )}

      {currentModal === "ClusterInstructionsModal" && (
        <Modal
          onRequestClose={() => setCurrentModal(null, null)}
          width="760px"
          height="650px"
        >
          <ClusterInstructionsModal />
        </Modal>
      )}

      {/* We should be careful, as this component is named Update but is for deletion */}
      {isAuth("cluster", "", ["get", "delete"]) &&
        currentModal === "UpdateClusterModal" && (
          <Modal
            onRequestClose={() => setCurrentModal(null, null)}
            width="565px"
            height="275px"
          >
            <UpdateClusterModal
              setRefreshClusters={(x: boolean) => setRefreshClusters(x)}
            />
          </Modal>
        )}
      {currentModal === "IntegrationsModal" && (
        <Modal
          onRequestClose={() => setCurrentModal(null, null)}
          width="760px"
          height="725px"
        >
          <IntegrationsModal />
        </Modal>
      )}
      {currentModal === "IntegrationsInstructionsModal" && (
        <Modal
          onRequestClose={() => setCurrentModal(null, null)}
          width="760px"
          height="650px"
        >
          <IntegrationsInstructionsModal />
        </Modal>
      )}
      {isAuth("namespace", "", ["get", "create"]) &&
        currentModal === "NamespaceModal" && (
          <Modal
            onRequestClose={() => setCurrentModal(null, null)}
            width="600px"
            height="220px"
          >
            <NamespaceModal />
          </Modal>
        )}
      {isAuth("namespace", "", ["get", "delete"]) &&
        currentModal === "DeleteNamespaceModal" && (
          <Modal
            onRequestClose={() => setCurrentModal(null, null)}
            width="700px"
            height="280px"
          >
            <DeleteNamespaceModal />
          </Modal>
        )}

      {currentModal === "EditInviteOrCollaboratorModal" && (
        <Modal
          onRequestClose={() => setCurrentModal(null, null)}
          width="600px"
          height="250px"
        >
          <EditInviteOrCollaboratorModal />
        </Modal>
      )}
      {currentModal === "AccountSettingsModal" && (
        <Modal
          onRequestClose={() => setCurrentModal(null, null)}
          width="760px"
          height="440px"
        >
          <AccountSettingsModal />
        </Modal>
      )}
    </>
  );
};

export default ModalHandler;
