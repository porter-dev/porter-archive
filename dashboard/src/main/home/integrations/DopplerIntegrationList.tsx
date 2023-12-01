import React, { useContext, useRef, useState, useEffect } from "react";
import ConfirmOverlay from "../../../components/ConfirmOverlay";
import styled from "styled-components";
import { Context } from "../../../shared/Context";
import api from "../../../shared/api";

import doppler from "assets/doppler.png";

import Placeholder from "components/Placeholder";
import Banner from "components/porter/Banner";
import ToggleRow from "components/porter/ToggleRow";
import Spacer from "components/porter/Spacer";
import Button from "components/porter/Button";
import Modal from "components/porter/Modal";
import Text from "components/porter/Text";
import Input from "components/porter/Input";
import Container from "components/porter/Container";

const DopplerIntegrationList: React.FC = (_) => {
  const [dopplerEnabled, setDopplerEnabled] = useState<boolean>(false);
  const [dopplerToggled, setDopplerToggled] = useState<boolean>(false);
  const [showServiceTokenModal, setShowServiceTokenModal] = useState<boolean>(false);
  const [envGroupName, setEnvGroupName] = useState<string>("");
  const [dopplerServiceToken, setDopplerServiceToken] = useState<string>("");
  const [dopplerEnvGroups, setDopplerEnvGroups] = useState<any[]>([]);

  const { currentCluster, currentProject } = useContext(
    Context
  );

  // Check for the "doppler-integration" namespace
  const checkDopplerEnabled = (): void => {
    api
    .getNamespaces(
      "<token>",
      {},
      { id: currentProject.id, cluster_id: currentCluster.id }
    )
    .then((res) => {
      res.data?.forEach((namespace: { name: string }) => {
        if (namespace.name === "doppler-integration") {
          setDopplerEnabled(true);
        }
      });
    })
    .catch((_) => {});
  };

  const installDoppler = (): void => {
    setDopplerToggled(true);

    // DOPPLER_TODO: call endpoint to install doppler
    // Will automatically check for doppler-integration namespace in 10 seconds or on refresh

    setTimeout(() => {
      checkDopplerEnabled();
    }, 10000);
  };

  const loadDopplerEnvGroups = (): void => {
    // DOPPLER_TODO: replace dummy data
    setDopplerEnvGroups([
      {
        name: "my-doppler-dev",
        serviceToken: "dp.st...abcdef",
      },
      {
        name: "my-doppler-staging",
        serviceToken: "dp.st...abcdef",
      },
      {
        name: "my-doppler-prod",
        serviceToken: "dp.st...abcdef",
      }
    ]);
  };

  // Install the CRD for a new Doppler secret
  const addDopplerEnvGroup = (): void => {
    // DOPPLER_TODO: call endpoint to install doppler CRD
    // Call the following after the API call succeeds:
    setShowServiceTokenModal(false);
    loadDopplerEnvGroups();
  };

  const deleteDopplerEnvGroup = (envGroupName: string): void => {
    // DOPPLER_TODO: call endpoint to delete doppler CRD
    // Call the following after the API call succeeds:
    loadDopplerEnvGroups();
  };

  useEffect(() => {
    checkDopplerEnabled();
  }, []);

  useEffect(() => {
    if (dopplerEnabled) {
      loadDopplerEnvGroups();
    }
  }, [dopplerEnabled]);

  if (!dopplerEnabled) {
    return (
      <>
        <Banner icon="none">
          <ToggleRow
            isToggled={dopplerToggled}
            onToggle={installDoppler}
            disabled={dopplerToggled}
          >
            {dopplerToggled ? "Enabling Doppler integration . . ." : "Enable Doppler integration"}
          </ToggleRow>
        </Banner>
        <Spacer y={1} />
        <Placeholder>
          You need to enable the Doppler integration to add environment groups from Doppler.
        </Placeholder>
      </>
    );
  }

  return (
    <>
      <Button onClick={() => { setShowServiceTokenModal(true) }}>
        + Add Doppler env group
      </Button>
      <Spacer y={1} />

      {dopplerEnvGroups.length > 0 ? (
        <>
          {dopplerEnvGroups.map((envGroup: any, i: number) => {
            return (
              <DopplerRow key={i}>
                <Container row>
                  <Icon src={doppler} />
                  <Text>
                    {envGroup.name}
                  </Text>
                </Container>
                <DeleteButton onClick={() => deleteDopplerEnvGroup(envGroup.name)}>
                  <i className="material-icons">delete</i>
                </DeleteButton>
              </DopplerRow>
            );
          })}
        </>
      ) : (
        <Placeholder>No environment groups have been added from Doppler yet</Placeholder>
      )}

      {showServiceTokenModal &&
        <Modal closeModal={() => { setShowServiceTokenModal(false) }}>
          <Text size={16}>
            Add a new Doppler service token
          </Text>
          <Spacer y={1} />
          <Text color="helper">
            Your Doppler secrets will be made available to Porter apps as an environment group.
          </Text>
          <Spacer y={1} />
          <Input
            placeholder="ex: my-doppler-env"
            label="Env group name (vanity name for Porter)"
            value={envGroupName}
            setValue={(x) => { setEnvGroupName(x) }}
            width="100%"
            height="40px"
          />
          <Spacer y={1} />
          <Input
            type="password"
            placeholder="ex: dp.st...abcdef"
            label="Doppler service token"
            value={dopplerServiceToken}
            setValue={(x) => { setDopplerServiceToken(x) }}
            width="100%"
            height="40px"
          />
          <Spacer y={1} />
          <Button 
            onClick={addDopplerEnvGroup}
            disabled={envGroupName === "" || dopplerServiceToken === ""}
          >
            Add Doppler env group 
          </Button>
        </Modal>
      }
    </>
  );
};

export default DopplerIntegrationList;

const DeleteButton = styled.div`
  display: flex;
  visibility: ${(props: { invis?: boolean }) =>
    props.invis ? "hidden" : "visible"};
  align-items: center;
  justify-content: center;
  width: 30px;
  float: right;
  height: 30px;
  :hover {
    background: #ffffff11;
    border-radius: 20px;
    cursor: pointer;
  }

  > i {
    font-size: 20px;
    color: #ffffff44;
    border-radius: 20px;
  }
`;

const Icon = styled.img`
  height: 20px;
  margin-right: 10px;
`;

const DopplerRow = styled.div`
  position: relative;
  padding: 15px;
  border-radius: 5px;
  background: ${props => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  font-size: 13px;
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  cursor: not-allowed;
  justify-content: space-between;
`;