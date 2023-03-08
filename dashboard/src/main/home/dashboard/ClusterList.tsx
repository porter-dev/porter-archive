import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";
import { pushFiltered } from "shared/routing";
import { useHistory, useLocation } from "react-router";

import api from "shared/api";
import loading from "assets/loading.gif";
import Loading from "components/Loading";

import { Context } from "shared/Context";

type Props = {};

const ClusterList: React.FC<Props> = ({}) => {
  const { currentProject, setCurrentCluster } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [clusters, setClusters] = useState(null);
  const location = useLocation();
  const history = useHistory();

  useEffect(() => {
    api.getClusters(
      "<token>",
      {},
      { id: currentProject.id },
    )
      .then(({ data }) => {
        console.log(data);
        setClusters(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [currentProject]);

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
      </DashboardIcon>
    );
  };

  return (
    <>
      {
        isLoading ? (
          <LoadingWrapper><Loading /></LoadingWrapper>
        ) : (
          <StyledClusterList>
            {clusters.map((cluster: any) => {
              return (
                <ClusterRow
                  key={cluster.id}
                  onClick={() => {
                    setCurrentCluster(cluster);
                    pushFiltered({ location, history }, "/applications", ["project_id"], {
                      cluster: cluster.name,
                    });
                  }}
                >
                  {renderIcon()}
                  {cluster.name}
                  {
                    (
                      cluster.status === "UPDATING" || cluster.status === "UPDATING_UNAVAILABLE"
                    ) && (
                      <Status
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentCluster(cluster);
                          pushFiltered({ location, history }, "/cluster-dashboard", ["project_id"], {
                            cluster: cluster.name,
                          });
                        }}
                      >
                        <Img src={loading} /> Updating
                      </Status>
                    )
                  }
                </ClusterRow>
              )
            })}
          </StyledClusterList>
        )
      }
    </>
  );
};

export default ClusterList;

const Img = styled.img`
  height: 15px;
  margin-right: 7px;
`;

const Status = styled.div`
  margin-left: 15px;
  border-radius: 50px;
  padding: 5px 10px;
  background: #ffffff11;
  color: #aaaabb;
  display: flex;
  align-items: center;

  :hover {
    background: #ffffff22;
    border: 1px solid #7a7b80;
    margin-top: -1px;
    margin-bottom: -1px;
    margin-left: 14px;
  }
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

const ClusterRow = styled.div`
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
  background: #26292e;
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

const StyledClusterList = styled.div`
`;

const LoadingWrapper = styled.div`
  height: calc(100vh - 450px);
  display: flex;
  align-items: center;
  justify-content: center;
`;