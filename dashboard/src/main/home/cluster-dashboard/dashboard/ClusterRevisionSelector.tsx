import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import api from "shared/api";
import loading from "assets/loading.gif";
import pencil from "assets/pencil.png";

import { readableDate } from "shared/string_utils";
import { Context } from "shared/Context";
import ExpandableSection from "components/ExpandableSection";
import { 
  Contract, 
  Cluster, 
  EKS, 
  NodeGroupType, 
  EnumKubernetesKind, 
  EnumCloudProvider 
} from "@porter-dev/api-contracts";

type Props = {
  selectedClusterVersion: any;
  setSelectedClusterVersion: any;
  setShowProvisionerStatus: any;
};

const ClusterRevisionSelector: React.FC<Props> = ({
  selectedClusterVersion,
  setSelectedClusterVersion,
  setShowProvisionerStatus,
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [versions, setVersions] = useState<any[]>(null);
  const [selectedId, setSelectedId] = useState(null);
  const [pendingContract, setPendingContract] = useState(null);
  const [failedContractId, setFailedContractId] = useState("");

  const processVersions = (data: any) => {
    setFailedContractId("");
    data.sort((a: any, b: any) => {
      return Date.parse(a.CreatedAt) > Date.parse(b.CreatedAt) ? -1 : 1;
    });
    let activeCandidate;
    if (data[0].condition !== "SUCCESS") {
      activeCandidate = data[0];
      setPendingContract(activeCandidate);

      if (data[0].condition !== "") {
        console.log(data[0])
        setFailedContractId(data[0].id);
      }
    }

    const successes = data.filter((x: any) => {
      return x.condition === "SUCCESS";
    });

    // Handle active provisioning attempt
    if (activeCandidate) {
      setSelectedClusterVersion(JSON.parse(atob(activeCandidate.base64_contract)));
      setSelectedId(-1);
      setShowProvisionerStatus(true);
    } else {
      setSelectedClusterVersion(JSON.parse(atob(successes[0].base64_contract)));
      setSelectedId(0);
      setShowProvisionerStatus(false);
    }
    setVersions(successes);
  }

  const updateContracts = () => {
    api.getContracts(
      "<token>",
      {},
      { project_id: currentProject.id },
    )
      .then(({ data }) => {
        const filtered_data = data.filter((x: any) => {
          return x.cluster_id === currentCluster.id;
        });
        processVersions(filtered_data);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  useEffect(() => {
    updateContracts();
  }, [currentCluster]);
  
  const createContract = () => {
    if (false) {
      api.createContract(
        "<token>",
        selectedClusterVersion,
        { project_id: currentProject.id }
      )
        .then(() => {
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };

const deleteContract = () => {
    api.deleteContract(
      "<token>",
      {},
      { 
        project_id: currentProject.id,
        revision_id: failedContractId,
      }
    )
      .then(() => {
        updateContracts();
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const renderVersionList = () => {
    return versions?.map((version: any, i: number) => {
      return (
        <Tr
          key={i}
          onClick={() => {
            setSelectedClusterVersion(JSON.parse(atob(version.base64_contract)));
            setSelectedId(i);
            setShowProvisionerStatus(false);
          }}
          selected={selectedId === i}
        >
          <Td>{versions.length - i}</Td>
          <Td>{readableDate(version.CreatedAt)}</Td>
          {/*
          <Td>
            <RollbackButton
              disabled={i === 0}
              onClick={createContract}
            >
              {i === 0 ? "Current" : "Revert"}
            </RollbackButton>
          </Td>
          */}
        </Tr>
      );
    });
  };

  const renderActiveAttempt = () => {
    return (
      <Tr
        onClick={() => {
          setSelectedClusterVersion(JSON.parse(atob(pendingContract.base64_contract)));
          setSelectedId(-1);
          setShowProvisionerStatus(true);
        }}
        selected={selectedId === -1}
      >
        <Td>
          {
            failedContractId ? (
              <Failed>Failed</Failed>
            ) : (
              <Flex><Img src={loading} /> Updating</Flex>
            )
          }
        </Td>
        <Td>{readableDate(pendingContract.CreatedAt)}</Td>
        {/*
        <Td>
          <RollbackButton
            disabled={i === 0}
            onClick={createContract}
          >
            {i === 0 ? "Current" : "Revert"}
          </RollbackButton>
        </Td>
        */}
      </Tr>
    );
  };

  return (
    <StyledClusterRevisionSelector>
      <ExpandableSection
        isInitiallyExpanded={false}
        color={selectedId <= 0 ? "#ffffff66" : "#f5cb42"}
        Header={(
          <>
            <Label isCurrent={selectedId <= 0}>
              {
                selectedId === 0 ? (
                  "Current version -"
                ) : (
                  selectedId === -1 ? (
                    failedContractId ? (
                      "Update failed -"
                    ) : (
                      "In progress -"
                    )
                  ) : (
                    "Previewing revision (not deployed) -"
                  )
                )
              }
            </Label>
            {
              selectedId === -1 ? (
                failedContractId ? (
                  <>
                    <Button onClick={(e) => {
                      deleteContract();
                      e.stopPropagation();
                    }}>
                      <Icon src={pencil} />
                      Clear attempt
                    </Button>
                  </>
                ) : (
                  <><Img src={loading} /> Updating</>
                )
              ) : (
                `No. ${versions?.length - selectedId}`
              )
            }
          </>
        )}
        ExpandedSection={(
          <TableWrapper>
            <RevisionsTable>
              <tbody>
                <Tr disableHover={true}>
                  <Th>Version no.</Th>
                  <Th>Created</Th>
                  {/* <Th>Rollback</Th> */}
                </Tr>
                {(pendingContract || failedContractId) && renderActiveAttempt()}
                {renderVersionList()}
              </tbody>
            </RevisionsTable>
          </TableWrapper>
        )}
      />
    </StyledClusterRevisionSelector>
  );
};

export default ClusterRevisionSelector;

const Icon = styled.img`
  height: 15px;
  margin-right: 5px;
  margin-left: -2px;
`;

const Button = styled.div`
  border-radius: 3px;
  padding: 10px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #616FEEcc;
  :hover {
    background: #505edddd;
  }
`;

const Failed = styled.div`
  background: #cc3d42;
  width: 55px;
  border-radius: 3px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  color: #aaaabb;
`;

const Img = styled.img`
  height: 15px;
  margin-right: 7px;
`;

const RollbackButton = styled.div`
  cursor: ${(props: { disabled: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  display: flex;
  border-radius: 3px;
  cursor: not-allowed;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  height: 21px;
  font-size: 13px;
  width: 70px;
  background: ${(props: { disabled: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled: boolean }) =>
      props.disabled ? "" : "#405eddbb"};
  }
`;

const Tr = styled.tr`
  height: 40px;
  line-height: 2.2em;
  cursor: ${(props: { disableHover?: boolean; selected?: boolean }) =>
    props.disableHover ? "" : "pointer"};
  background: ${(props: { disableHover?: boolean; selected?: boolean }) =>
    props.selected ? "#ffffff11" : ""};
  :hover {
    background: ${(props: { disableHover?: boolean; selected?: boolean }) =>
      props.disableHover ? "" : "#ffffff22"};
  }
`;

const Td = styled.td`
  font-size: 13px;
  color: #ffffff;
  padding-left: 32px;
`;

const Th = styled.td`
  font-size: 13px;
  font-weight: 500;
  color: #aaaabb;
  padding-left: 32px;
`;

const RevisionsTable = styled.table`
  width: 100%;
  margin-top: 5px;
  padding-left: 32px;
  padding-bottom: 20px;
  min-width: 500px;
  border-collapse: collapse;
`;

const TableWrapper = styled.div`
  padding-bottom: 20px;
  width: 100%;
  font-size: 13px;
  overflow-y: auto;
  max-height: 200px;
`;

const Label = styled.div<{ isCurrent?: boolean }>`
  color: ${props => props.isCurrent ? "#ffffff66" : "#f5cb42"};
  margin-right: 5px;
`;

const StyledClusterRevisionSelector = styled.div`
  margin-bottom: 22px;
`;