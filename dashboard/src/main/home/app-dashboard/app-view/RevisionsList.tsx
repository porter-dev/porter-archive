import { useQuery } from "@tanstack/react-query";
import { AppRevision, appRevisionValidator } from "lib/revisions/types";
import React, { useCallback, useState } from "react";
import api from "shared/api";
import styled from "styled-components";
import { match } from "ts-pattern";
import loading from "assets/loading.gif";
import {
  PorterAppFormData,
  SourceOptions,
  clientAppFromProto,
} from "lib/porter-apps";
import { z } from "zod";
import { PorterApp } from "@porter-dev/api-contracts";
import { readableDate } from "shared/string_utils";
import Text from "components/porter/Text";
import { useLatestRevision } from "./LatestRevisionContext";
import { useFormContext } from "react-hook-form";
import ConfirmOverlay from "components/porter/ConfirmOverlay";

type Props = {
  deploymentTargetId: string;
  projectId: number;
  clusterId: number;
  appName: string;
  latestSource: SourceOptions;
  latestRevisionNumber: number;
  onSubmit: () => Promise<void>;
};

const RED = "#ff0000";
const YELLOW = "#FFA500";

const RevisionsList: React.FC<Props> = ({
  latestRevisionNumber,
  deploymentTargetId,
  projectId,
  clusterId,
  appName,
  latestSource,
  onSubmit,
}) => {
  const {
    previewRevision,
    setPreviewRevision,
    servicesFromYaml,
  } = useLatestRevision();
  const { reset, setValue } = useFormContext<PorterAppFormData>();
  const [expandRevisions, setExpandRevisions] = useState(false);
  const [revertData, setRevertData] = useState<{
    app: PorterApp;
    revision: number;
  } | null>(null);

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
          app_revisions: z.array(appRevisionValidator),
        })
        .parseAsync(res.data);

      return revisions;
    }
  );

  const getReadableStatus = (status: AppRevision["status"]) =>
    match(status)
      .with("CREATED", () => "Created")
      .with("AWAITING_BUILD_ARTIFACT", () => "Awaiting Build")
      .with("READY_TO_APPLY", () => "Deploying")
      .with("AWAITING_PREDEPLOY", () => "Awaiting Pre-Deploy")
      .with("BUILD_CANCELED", () => "Build Canceled")
      .with("BUILD_FAILED", () => "Build Failed")
      .with("DEPLOY_FAILED", () => "Deploy Failed")
      .with("DEPLOYED", () => "Deployed")
      .exhaustive();

  const getDotColor = (status: AppRevision["status"]) =>
    match(status)
      .with(
        "CREATED",
        "AWAITING_BUILD_ARTIFACT",
        "READY_TO_APPLY",
        "AWAITING_PREDEPLOY",
        () => YELLOW
      )
      .otherwise(() => RED);

  const getTableHeader = (latestRevision?: AppRevision) => {
    if (!latestRevision) {
      return "Revisions";
    }

    if (previewRevision) {
      return "Previewing revision (not deployed) -";
    }

    return "Current revision - ";
  };

  const getSelectedRevisionNumber = (args: {
    numDeployed: number;
    latestRevision?: AppRevision;
  }) => {
    const { numDeployed, latestRevision } = args;

    if (previewRevision) {
      return previewRevision;
    }

    if (latestRevision && latestRevision.revision_number !== 0) {
      return latestRevision.revision_number;
    }

    return numDeployed + 1;
  };

  const onRevert = useCallback(async () => {
    if (!revertData) {
      return;
    }

    setValue("app", clientAppFromProto(revertData.app, servicesFromYaml));
    setRevertData(null);

    void onSubmit();
  }, [onSubmit, setValue, revertData]);

  const renderContents = (revisions: AppRevision[]) => {
    const revisionsWithProto = revisions.map((revision) => {
      return {
        ...revision,
        app_proto: PorterApp.fromJsonString(atob(revision.b64_app_proto)),
      };
    });

    const deployedRevisions = revisionsWithProto.filter(
      (r) => r.revision_number !== 0
    );
    const pendingRevisions = revisionsWithProto.filter(
      (r) => r.revision_number === 0
    );

    return (
      <div>
        <RevisionHeader
          showRevisions={expandRevisions}
          isCurrent={!previewRevision}
          onClick={() => {
            setExpandRevisions((prev) => !prev);
          }}
        >
          <RevisionPreview>
            <i className="material-icons">arrow_drop_down</i>
            {getTableHeader(revisions[0])}
            {revisions[0] ? (
              <Revision>
                No.{" "}
                {getSelectedRevisionNumber({
                  numDeployed: deployedRevisions.length,
                  latestRevision: revisions[0],
                })}
              </Revision>
            ) : null}
          </RevisionPreview>
        </RevisionHeader>
        <RevisionList>
          <TableWrapper>
            <RevisionsTable>
              <tbody>
                <Tr disableHover>
                  <Th>Revision no.</Th>
                  <Th>
                    {revisionsWithProto[0]?.app_proto.build
                      ? "Commit SHA"
                      : "Image Tag"}
                  </Th>
                  <Th>Timestamp</Th>
                  <Th>Status</Th>
                  <Th>Rollback</Th>
                </Tr>
                {pendingRevisions.length > 0 &&
                  pendingRevisions.map((revision) => (
                    <Tr key={new Date(revision.updated_at).toUTCString()}>
                      <Td>{deployedRevisions.length + 1}</Td>
                      <Td>
                        {revision.app_proto.build
                          ? revision.app_proto.build.commitSha.substring(0, 7)
                          : revision.app_proto.image?.tag}
                      </Td>
                      <Td>{readableDate(revision.updated_at)}</Td>
                      <Td>
                        <StatusContainer>
                          <Text>{getReadableStatus(revision.status)}</Text>
                          <StatusDot color={getDotColor(revision.status)} />
                        </StatusContainer>
                      </Td>
                      <Td>-</Td>
                    </Tr>
                  ))}

                {deployedRevisions.map((revision, i) => {
                  const isLatestDeployedRevision =
                    latestRevisionNumber !== 0
                      ? revision.revision_number === latestRevisionNumber
                      : i === 0;

                  return (
                    <Tr
                      key={revision.revision_number}
                      selected={
                        previewRevision
                          ? revision.revision_number === previewRevision
                          : isLatestDeployedRevision
                      }
                      onClick={() => {
                        reset({
                          app: clientAppFromProto(
                            revision.app_proto,
                            servicesFromYaml
                          ),
                          source: latestSource,
                        });
                        setPreviewRevision(
                          isLatestDeployedRevision
                            ? null
                            : revision.revision_number
                        );
                      }}
                    >
                      <Td>{revision.revision_number}</Td>

                      <Td>
                        {revision.app_proto.build
                          ? revision.app_proto.build.commitSha.substring(0, 7)
                          : revision.app_proto.image?.tag}
                      </Td>
                      <Td>{readableDate(revision.updated_at)}</Td>
                      <Td>
                        {!isLatestDeployedRevision ? (
                          getReadableStatus(revision.status)
                        ) : (
                          <StatusContainer>
                            <Text>{getReadableStatus(revision.status)}</Text>
                            <StatusDot />
                          </StatusContainer>
                        )}
                      </Td>
                      <Td>
                        <RollbackButton
                          disabled={isLatestDeployedRevision}
                          onClick={() => {
                            if (isLatestDeployedRevision) {
                              return;
                            }

                            setRevertData({
                              app: revision.app_proto,
                              revision: revision.revision_number,
                            });
                          }}
                        >
                          {isLatestDeployedRevision ? "Current" : "Revert"}
                        </RollbackButton>
                      </Td>
                    </Tr>
                  );
                })}
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
          renderContents(data.app_revisions)
        )
        .otherwise(() => null)}
      {revertData ? (
        <ConfirmOverlay
          message={`Are you sure you want to revert to revision ${revertData?.revision}?`}
          onYes={onRevert}
          onNo={() => {
            setRevertData(null);
          }}
        />
      ) : null}
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

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
`;

const StatusDot = styled.div<{ color?: string }>`
  min-width: 7px;
  max-width: 7px;
  height: 7px;
  margin-left: 10px;
  border-radius: 50%;
  background: ${(props) => props.color || "#38a88a"};

  box-shadow: 0 0 0 0 rgba(0, 0, 0, 1);
  transform: scale(1);
  animation: pulse 2s infinite;
  @keyframes pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.9);
    }

    70% {
      transform: scale(1);
      box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
    }

    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
    }
  }
`;
