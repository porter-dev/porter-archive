import { Collapse, Snackbar } from "@material-ui/core";
import { Alert } from "@material-ui/lab";
import Modal from "main/home/modals/Modal";
import React from "react";
import styled from "styled-components";
import { proxy, useSnapshot } from "valtio";

const state = proxy({
  showUnauthorizedPopup: false,
  message: "",
  expanded: false,
});

const actions = {
  showUnauthorizedPopup: (message: string) => {
    state.showUnauthorizedPopup = true;
    state.message = message;
  },
  hideUnauthorizedPopup: () => {
    state.showUnauthorizedPopup = false;
    state.expanded = false;
    state.message = "";
  },
  toggleExpanded: () => {
    state.expanded = !state.expanded;
  },
};

export const UnauthorizedPopupActions = actions;

export const UnauthorizedPopup = () => {
  const { showUnauthorizedPopup, message, expanded } = useSnapshot(state);

  if (!showUnauthorizedPopup) {
    return null;
  }

  if (expanded) {
    // TODO: Implement expanded view. Should be a modal with the full message and contact information.
    return (
      <Modal onRequestClose={actions.toggleExpanded} height="fit-content">
        <ModalContentWrapper>
          <ModalTitle>Unauthorized</ModalTitle>
          <ModalMessage>{message}</ModalMessage>
          <ModalContact>
            Please contact your administrator. If you think this is a mistake,
            please contact us at{" "}
            <a href="mailto:contact@getporter.dev">contact@getporter.dev</a>
          </ModalContact>
        </ModalContentWrapper>
      </Modal>
    );
  }

  return (
    <>
      <Collapse in={showUnauthorizedPopup}>
        <Snackbar open={true} onClose={actions.hideUnauthorizedPopup}>
          <Alert
            onClose={actions.hideUnauthorizedPopup}
            severity="warning"
            action={
              <>
                <ActionButton onClick={actions.toggleExpanded}>
                  <i className="material-icons">open_in_new</i>
                </ActionButton>
                <ActionButton onClick={actions.hideUnauthorizedPopup}>
                  <i className="material-icons">close</i>
                </ActionButton>
              </>
            }
          >
            {message}
          </Alert>
        </Snackbar>
      </Collapse>
    </>
  );
};

const ActionButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  margin: 0;
  margin-left: 10px;
  :hover {
    background: #ffffff22;
  }
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 18px;
  }
`;

const ModalContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalTitle = styled.div`
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 10px;
`;

const ModalMessage = styled.div`
  font-size: 14px;
  margin-bottom: 10px;
`;

const ModalContact = styled.div`
  font-size: 14px;
  margin-bottom: 10px;
  text-align: center;
`;
