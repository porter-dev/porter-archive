import React, { useState, useEffect, useContext } from "react";
import styled from "styled-components";
import { useLocation, useHistory, withRouter } from "react-router-dom";

import { Context } from "shared/Context";
import api from "shared/api";
import { ClusterType, DetailedClusterType } from "shared/types";
import Helper from "components/form-components/Helper";
import { pushFiltered } from "shared/routing";

import Modal from "../modals/Modal";
import Heading from "components/form-components/Heading";

type PropsType = {
  currentCluster: ClusterType;
};

const Templates: React.FC<PropsType> = ({ currentCluster }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [clusters, setClusters] = useState<DetailedClusterType[]>([]);
  const [showErrorModal, setShowErrorModal] = useState<{ clusterId: number, show: boolean } | undefined>(undefined);

  const context = useContext(Context);
  const location = useLocation();
  const history = useHistory();

  useEffect(() => {
    updateClusterList();
  }, [currentCluster]);

  const handleNavigateToDashboard = (cluster: ClusterType) => {
    context.setCurrentCluster(cluster);
    history.push("/cluster-dashboard/info", { cluster: cluster.name });
  }

  const updateClusterList = async () => {
    try {
      setLoading(true)
      const res = await api.getClusters(
        "<token>",
        {},
        { id: context.currentProject.id }
      );

      if (res.data) {
        setClusters(res.data);
        setLoading(false);
        setError("");
      } else {
        setLoading(false);
        setError("Response data missing");
      }
    } catch (err) {
      setError(err.toString());
    }
  };

  const renderIcon = () => {
    return (
      <DashboardIcon>
        <svg
          width="16"
          height="16"
          viewBox="0 0 19 19"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15.207 12.4403C16.8094 12.4403 18.1092 11.1414 18.1092 9.53907C18.1092 7.93673 16.8094 6.63782 15.207 6.63782"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3.90217 12.4403C2.29983 12.4403 1 11.1414 1 9.53907C1 7.93673 2.29983 6.63782 3.90217 6.63782"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M9.54993 13.4133C7.4086 13.4133 5.69168 11.6964 5.69168 9.55417C5.69168 7.41284 7.4086 5.69592 9.54993 5.69592C11.6913 5.69592 13.4082 7.41284 13.4082 9.55417C13.4082 11.6964 11.6913 13.4133 9.54993 13.4133Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.66895 15.207C6.66895 16.8094 7.96787 18.1092 9.5702 18.1092C11.1725 18.1092 12.4715 16.8094 12.4715 15.207"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.66895 3.90217C6.66895 2.29983 7.96787 1 9.5702 1C11.1725 1 12.4715 2.29983 12.4715 3.90217"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.69591 9.54996C5.69591 7.40863 7.41283 5.69171 9.55508 5.69171C11.6964 5.69171 13.4133 7.40863 13.4133 9.54996C13.4133 11.6913 11.6964 13.4082 9.55508 13.4082C7.41283 13.4082 5.69591 11.6913 5.69591 9.54996Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </DashboardIcon>
    );
  };

  const renderClusterList = () => {
    return clusters.map(
      (cluster: DetailedClusterType, i: number) => {
        return (
          <TemplateBlock
            onClick={() => handleNavigateToDashboard(cluster)}
            key={i}
          >
            {renderIcon()}
            <TemplateTitle>{cluster.vanity_name || cluster.name}</TemplateTitle>
          </TemplateBlock>
        );
      }
    );
  };

  const renderErrorModal = () => {
    const clusterError = showErrorModal?.show &&
      clusters.find((c) => c.id === showErrorModal?.clusterId);
    const ingressError = clusterError?.ingress_error;

    return (
      <>
        {clusterError && (
          <Modal
            onRequestClose={() => setShowErrorModal(undefined)}
            width="665px"
            height="min-content"
          >
            Porter encountered an error. Full error log:
            <CodeBlock>{ingressError.error}</CodeBlock>
          </Modal>
        )}
      </>
    );
  };

  return (
    <StyledClusterList>
      <TemplateList>{renderClusterList()}</TemplateList>
      {renderErrorModal()}
    </StyledClusterList>
  );
}

export default Templates;

const CodeBlock = styled.span`
  display: block;
  background-color: #1b1d26;
  color: white;
  border-radius: 5px;
  font-family: monospace;
  user-select: text;
  max-height: 400px;
  width: 90%;
  margin-left: 5%;
  margin-top: 20px;
  overflow-y: auto;
  padding: 10px;
  overflow-wrap: break-word;
`;

const StyledClusterList = styled.div`
  padding-left: 2px;
  overflow: visible;
`;

const DashboardIcon = styled.div`
  position: relative;
  height: 25px;
  min-width: 25px;
  width: 25px;
  border-radius: 200px;
  margin-right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #676c7c;
  border: 1px solid #8e94aa;
  > i {
    font-size: 22px;
  }
`;

const TemplateTitle = styled.div`
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const TemplateBlock = styled.div`
  align-items: center;
  user-select: none;
  display: flex;
  font-size: 13px;
  font-weight: 500;
  padding: 15px;
  margin-bottom: 20px;
  align-item: center;
  cursor: pointer;
  color: #ffffff;
  position: relative;
  border-radius: 5px;
  background: ${props => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const TemplateList = styled.div`
  overflow-y: auto;
  overflow: visible;
`;
