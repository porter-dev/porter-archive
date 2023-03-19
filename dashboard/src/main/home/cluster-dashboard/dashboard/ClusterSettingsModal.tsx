import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";

import Modal from "main/home/modals/Modal";
import Input from "components/porter/Input";
import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";

type Props = {
};

const ClusterSettingsModal: React.FC<Props> = ({
}) => {
  const { 
    setCurrentModal, 
    currentCluster, 
    currentProject,
    setShouldRefreshClusters,
  } = useContext(Context);
  const [clusterName, setClusterName] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    setClusterName(currentCluster.vanity_name || currentCluster.name);
  }, []);

  const renameCluster = async () => {
    setStatus("loading");
    try {
      const res = await api.renameCluster(
        "<token>",
        { name: clusterName },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );
      setStatus("success");
      setShouldRefreshClusters(true);
    } catch (err) {
      setStatus("error");
      console.log(err);
    }
  }

  return (
    <Modal
      width="600px"
      height="auto"
      onRequestClose={() => setCurrentModal(null, null)}
      title="Cluster name"
    >
      <Spacer height="15px" />
      <Flex>
        <IconWrapper>
        <svg
          width="18"
          height="18"
          viewBox="0 0 19 19"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15.207 12.4403C16.8094 12.4403 18.1092 11.1414 18.1092 9.53907C18.1092 7.93673 16.8094 6.63782 15.207 6.63782"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M3.90217 12.4403C2.29983 12.4403 1 11.1414 1 9.53907C1 7.93673 2.29983 6.63782 3.90217 6.63782"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            stroke-linejoin="round"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M9.54993 13.4133C7.4086 13.4133 5.69168 11.6964 5.69168 9.55417C5.69168 7.41284 7.4086 5.69592 9.54993 5.69592C11.6913 5.69592 13.4082 7.41284 13.4082 9.55417C13.4082 11.6964 11.6913 13.4133 9.54993 13.4133Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M6.66895 15.207C6.66895 16.8094 7.96787 18.1092 9.5702 18.1092C11.1725 18.1092 12.4715 16.8094 12.4715 15.207"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M6.66895 3.90217C6.66895 2.29983 7.96787 1 9.5702 1C11.1725 1 12.4715 2.29983 12.4715 3.90217"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            stroke-linejoin="round"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.69591 9.54996C5.69591 7.40863 7.41283 5.69171 9.55508 5.69171C11.6964 5.69171 13.4133 7.40863 13.4133 9.54996C13.4133 11.6913 11.6964 13.4082 9.55508 13.4082C7.41283 13.4082 5.69591 11.6913 5.69591 9.54996Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            stroke-linejoin="round"
          />
        </svg>
        </IconWrapper>
        <Spacer inline />
        <Input 
          placeholder="ex: my-cluster" 
          width="100%"
          value={clusterName}
          setValue={setClusterName}
        />
      </Flex>
      <Spacer y={1} />
      <Button 
        onClick={renameCluster}
        disabled={clusterName === ""}
        status={status}
      >
        Save
      </Button>
    </Modal>
  );
};

export default ClusterSettingsModal;

const IconWrapper = styled.div`
  min-width: 35px;
  height: 35px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #494b4f;
  border-radius: 5px;
  cursor: not-allowed;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;