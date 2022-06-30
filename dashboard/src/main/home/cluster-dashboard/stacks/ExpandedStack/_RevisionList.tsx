import Loading from "components/Loading";
import React, { useContext, useRef, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { readableDate } from "shared/string_utils";
import styled from "styled-components";
import { FullStackRevision, Stack, StackRevision } from "../types";

type RevisionListProps = {
  revisions: StackRevision[];
  currentRevision: StackRevision;
  latestRevision: StackRevision;
  stackNamespace: string;
  stackId: string;
  onRevisionClick: (revision: FullStackRevision) => void;
  onRollback: () => void;
};

const _RevisionList = ({
  revisions,
  currentRevision,
  latestRevision,
  stackNamespace,
  stackId,
  onRevisionClick,
  onRollback,
}: RevisionListProps) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const revisionCache = useRef<{ [id: number]: FullStackRevision }>({});

  const handleRevisionPreview = (revision: StackRevision) => {
    setIsLoading(true);

    if (revisionCache.current[revision.id]) {
      onRevisionClick(revisionCache.current[revision.id]);
      setIsLoading(false);
      return;
    }

    api
      .getStackRevision<FullStackRevision>(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: stackNamespace,
          revision_id: revision.id,
          stack_id: stackId,
        }
      )
      .then((res) => {
        const newRevision = res.data;
        revisionCache.current = {
          ...revisionCache.current,
          [newRevision.id]: newRevision,
        };
        onRevisionClick(newRevision);
      })
      .catch((err) => {
        setCurrentError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleRevisionRollback = (revision: StackRevision) => {
    setIsLoading(true);

    api
      .rollbackStack(
        "<token>",
        {
          target_revision: revision.id,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: stackNamespace,
          stack_id: stackId,
        }
      )
      .then(() => {
        onRollback();
      })
      .catch((err) => {
        setCurrentError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const revisionList = () => {
    if (revisions.length === 0) {
      return <div>No revisions</div>;
    }

    return revisions.map((revision, i) => {
      let isCurrent = latestRevision.id === revision.id;
      return (
        <Tr
          key={i}
          onClick={() => handleRevisionPreview(revision)}
          selected={currentRevision.id === revision.id}
        >
          <Td>{revision.id}</Td>
          <Td>{readableDate(revision.created_at)}</Td>
          <Td>
            <RollbackButton
              disabled={isCurrent}
              onClick={(e) => {
                e.stopPropagation();
                handleRevisionRollback(revision);
              }}
            >
              {isCurrent ? "Current" : "Revert"}
            </RollbackButton>
          </Td>
        </Tr>
      );
    });
  };

  return (
    <>
      <StyledRevisionSection showRevisions={isExpanded}>
        {isLoading ? (
          <LoadingOverlay>
            <Loading />
          </LoadingOverlay>
        ) : null}
        <RevisionHeader
          showRevisions={isExpanded}
          isCurrent={currentRevision.id === latestRevision.id}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <RevisionPreview>
            {currentRevision.id === latestRevision.id
              ? `Current Revision v${currentRevision.id}`
              : `Previewing Revision (Not Deployed) v${currentRevision.id}`}
            <i className="material-icons">arrow_drop_down</i>
          </RevisionPreview>
        </RevisionHeader>
        <TableWrapper>
          <RevisionsTable>
            <tbody>
              <Tr disableHover={true}>
                <Th>Revision No.</Th>
                <Th>Timestamp</Th>
                <Th>Rollback</Th>
              </Tr>
              {revisionList()}
            </tbody>
          </RevisionsTable>
        </TableWrapper>
      </StyledRevisionSection>
    </>
  );
};

export default _RevisionList;

const StyledRevisionSection = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  max-height: ${(props: { showRevisions: boolean }) =>
    props.showRevisions ? "255px" : "40px"};
  background: #ffffff11;
  margin: 25px 0px 18px;
  overflow: hidden;
  border-radius: 8px;
  animation: ${(props: { showRevisions: boolean }) =>
    props.showRevisions ? "expandRevisions 0.3s " : ""};
  animation-timing-function: "ease-out";
  @keyframes expandRevisions {
    from {
      max-height: 40px;
    }
    to {
      max-height: 250px;
    }
  }
`;

const RevisionHeader = styled.div`
  color: ${(props: { showRevisions: boolean; isCurrent: boolean }) =>
    props.isCurrent ? "#ffffff66" : "#f5cb42"};
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 15px;
  cursor: pointer;
  background: ${(props: { showRevisions: boolean; isCurrent: boolean }) =>
    props.showRevisions ? "#ffffff11" : ""};
  :hover {
    background: #ffffff18;
    > div > i {
      background: #ffffff22;
    }
  }

  > div > i {
    margin-left: 12px;
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    background: ${(props: { showRevisions: boolean; isCurrent: boolean }) =>
      props.showRevisions ? "#ffffff18" : ""};
    transform: ${(props: { showRevisions: boolean; isCurrent: boolean }) =>
      props.showRevisions ? "rotate(180deg)" : ""};
  }
`;

const RevisionPreview = styled.div`
  display: flex;
  align-items: center;
`;

const TableWrapper = styled.div`
  padding-bottom: 20px;
  overflow-y: auto;
`;

const RevisionsTable = styled.table`
  width: 100%;
  margin-top: 5px;
  padding-left: 32px;
  padding-bottom: 20px;
  min-width: 500px;
  border-collapse: collapse;
`;
const Tr = styled.tr`
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

const RollbackButton = styled.div`
  cursor: ${(props: { disabled: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  display: flex;
  border-radius: 3px;
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

const LoadingOverlay = styled.div`
  background: #43454b90;
  width: 100%;
  height: 100%;
  position: absolute;
`;
