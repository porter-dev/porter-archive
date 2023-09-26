import { useQuery } from "@tanstack/react-query";
import { appRevisionValidator } from "lib/revisions/types";
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
import { useFormContext } from "react-hook-form";
import ConfirmOverlay from "components/porter/ConfirmOverlay";
import { useLatestRevision } from "../../app-view/LatestRevisionContext";
import RevisionTableContents from "./RevisionTableContents";
import GHStatusBanner from "./GHStatusBanner";
import Spacer from "components/porter/Spacer";

type Props = {
  deploymentTargetId: string;
  projectId: number;
  clusterId: number;
  appName: string;
  latestSource: SourceOptions;
  latestRevisionNumber: number;
  onSubmit: () => Promise<void>;
};

const RevisionsList: React.FC<Props> = ({
  latestRevisionNumber,
  deploymentTargetId,
  projectId,
  clusterId,
  appName,
  latestSource,
  onSubmit,
}) => {
  const { servicesFromYaml } = useLatestRevision();
  const { setValue } = useFormContext<PorterAppFormData>();
  const [expandRevisions, setExpandRevisions] = useState(false);
  const [revertData, setRevertData] = useState<{
    app: PorterApp;
    revisionId: string;
    number: number;
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

  const onRevert = useCallback(async () => {
    if (!revertData) {
      return;
    }

    const res = await api.getRevision(
      "<token>",
      {},
      {
        project_id: projectId,
        cluster_id: clusterId,
        porter_app_name: appName,
        revision_id: revertData.revisionId,
      }
    );

    const { app_revision } = await z
      .object({
        app_revision: appRevisionValidator.extend({
          env: z.object({
            name: z.string(),
            latest_version: z.number(),
            variables: z.record(z.string(), z.string()).optional(),
            secret_variables: z.record(z.string(), z.string()).optional(),
            created_at: z.string(),
          }),
        }),
      })
      .parseAsync(res.data);

    setValue(
      "app",
      clientAppFromProto({
        proto: PorterApp.fromJsonString(atob(app_revision.b64_app_proto)),
        overrides: servicesFromYaml,
        variables: app_revision.env.variables,
        secrets: app_revision.env.secret_variables,
      })
    );
    setRevertData(null);

    void onSubmit();
  }, [onSubmit, setValue, revertData]);

  return (
    <div>
      <StyledRevisionSection showRevisions={expandRevisions}>
        {match(res)
          .with({ status: "loading" }, () => (
            <LoadingPlaceholder>
              <StatusWrapper>
                <LoadingGif src={loading} revision={false} /> Updating . . .
              </StatusWrapper>
            </LoadingPlaceholder>
          ))
          .with({ status: "success" }, ({ data }) => (
            <RevisionTableContents
              latestRevisionNumber={latestRevisionNumber}
              revisions={data.app_revisions}
              latestSource={latestSource}
              expandRevisions={expandRevisions}
              setExpandRevisions={setExpandRevisions}
              setRevertData={setRevertData}
            />
          ))
          .otherwise(() => null)}
        {revertData ? (
          <ConfirmOverlay
            message={`Are you sure you want to revert to revision ${revertData?.number}?`}
            onYes={onRevert}
            onNo={() => {
              setRevertData(null);
            }}
          />
        ) : null}
      </StyledRevisionSection>
      {res.data && (
        <>
          <GHStatusBanner revisions={res.data.app_revisions} />
          <Spacer y={0.5} />
        </>
      )}
    </div>
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
