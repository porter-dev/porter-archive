import { useQuery } from "@tanstack/react-query";
import { AppRevision, appRevisionValidator } from "lib/revisions/types";
import React, { useState } from "react";
import api from "shared/api";
import styled from "styled-components";
import { match } from "ts-pattern";
import loading from "assets/loading.gif";
import { SourceOptions } from "lib/porter-apps";
import { z } from "zod";
import { PorterApp } from "@porter-dev/api-contracts";
import { readableDate } from "shared/string_utils";

type Props = {
  latestRevisionNumber: number;
  deploymentTargetId: string;
  projectId: number;
  clusterId: number;
  appName: string;
  sourceType: SourceOptions["type"];
};

const RevisionsList: React.FC<Props> = ({
  latestRevisionNumber,
  deploymentTargetId,
  projectId,
  clusterId,
  appName,
  sourceType,
}) => {
  const [expandRevisions, setExpandRevisions] = useState(false);

  const res = useQuery(
    ["listAppRevisions", projectId, clusterId, latestRevisionNumber, appName],
    async () => {
      const res = await api.listAppRevisions(
        "<token>",
        {
          deployment_target_id: deploymentTargetId,
        },
        {
          project_id: projectId,
          cluster_id: clusterId,
          porter_app_name: appName,
        }
      );

      const revisions = await z
        .object({
          revisions: z.array(appRevisionValidator),
        })
        .parseAsync(res.data);

      return revisions;
    }
  );

  const renderContents = (revisions: AppRevision[]) => {
    const revisionsWithProto = revisions.map((revision) => {
      return {
        ...revision,
        app_proto: PorterApp.fromJsonString(atob(revision.b64_app_proto)),
      };
    });

    return (
      <div>
        <RevisionHeader
          showRevisions={expandRevisions}
          isCurrent
          onClick={() => {
            setExpandRevisions((prev) => !prev);
          }}
        >
          <RevisionPreview>
            <i className="material-icons">arrow_drop_down</i>
            Current version -{" "}
            <Revision>No. {revisions[0].revision_number}</Revision>
          </RevisionPreview>
        </RevisionHeader>
        <RevisionList>
          <TableWrapper>
            <RevisionsTable>
              <tbody>
                <Tr disableHover>
                  <Th>Revision no.</Th>
                  <Th>Timestamp</Th>
                  <Th>Image Tag</Th>
                  <Th>Rollback</Th>
                </Tr>
                {revisionsWithProto.map((revision) => (
                  <Tr key={revision.revision_number}>
                    <Td>{revision.revision_number}</Td>
                    <Td>{readableDate(revision.updated_at)}</Td>
                    <Td>{revision.app_proto.image?.tag}</Td>
                    <Td>
                      <RollbackButton
                        disabled={
                          revision.revision_number === latestRevisionNumber
                        }
                        onClick={() => {}}
                      >
                        {revision.revision_number === latestRevisionNumber
                          ? "Current"
                          : "Revert"}
                      </RollbackButton>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </RevisionsTable>
          </TableWrapper>
        </RevisionList>
      </div>
    );
  };

  return (
    <StyledRevisionSection showRevisions={expandRevisions}>
      {match(res)
        .with({ status: "loading" }, () => (
          <LoadingPlaceholder>
            <StatusWrapper>
              <LoadingGif src={loading} revision={false} /> Updating . . .
            </StatusWrapper>
          </LoadingPlaceholder>
        ))
        .with({ status: "success" }, ({ data }) =>
          renderContents(data.revisions)
        )
        .otherwise(() => null)}
    </StyledRevisionSection>
  );
};

export default RevisionsList;

const StyledRevisionSection = styled.div`
  width: 100%;
  max-height: ${(props: { showRevisions: boolean }) =>
    props.showRevisions ? "255px" : "40px"};
  margin: 20px 0px 18px;
  overflow: hidden;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
  animation: ${(props: { showRevisions: boolean }) =>
    props.showRevisions ? "expandRevisions 0.3s" : ""};
  animation-timing-function: ease-out;
  @keyframes expandRevisions {
    from {
      max-height: 40px;
    }
    to {
      max-height: 250px;
    }
  }
`;

const LoadingPlaceholder = styled.div`
  height: 40px;
  display: flex;
  align-items: center;
  padding-left: 20px;
`;

const LoadingGif = styled.img`
  width: 15px;
  height: 15px;
  margin-right: ${(props: { revision: boolean }) =>
    props.revision ? "0px" : "9px"};
  margin-left: ${(props: { revision: boolean }) =>
    props.revision ? "10px" : "0px"};
  margin-bottom: ${(props: { revision: boolean }) =>
    props.revision ? "-2px" : "0px"};
`;

const StatusWrapper = styled.div`
  display: flex;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #ffffff55;
  margin-right: 25px;
`;

const RevisionHeader = styled.div`
  color: ${(props: { showRevisions: boolean; isCurrent: boolean }) =>
    props.isCurrent ? "#ffffff66" : "#f5cb42"};
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 10px;
  cursor: pointer;
  background: ${({ theme }) => theme.fg};
  :hover {
    background: ${(props) => props.showRevisions && props.theme.fg2};
  }

  > div > i {
    margin-right: 8px;
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    transform: ${(props: { showRevisions: boolean; isCurrent: boolean }) =>
      props.showRevisions ? "" : "rotate(-90deg)"};
    transition: transform 0.1s ease;
  }
`;

const RevisionPreview = styled.div`
  display: flex;
  align-items: center;
`;

const Revision = styled.div`
  color: #ffffff;
  margin-left: 5px;
`;

const RevisionList = styled.div`
  overflow-y: auto;
  max-height: 215px;
`;

const TableWrapper = styled.div`
  padding-bottom: 20px;
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
