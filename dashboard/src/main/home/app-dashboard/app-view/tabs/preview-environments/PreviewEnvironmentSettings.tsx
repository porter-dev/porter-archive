import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import React from "react";
import { Link } from "react-router-dom";
import { useLatestRevision } from "../../LatestRevisionContext";
import { useQuery } from "@tanstack/react-query";
import api from "shared/api";
import { useGithubWorkflow } from "lib/hooks/useGithubWorkflow";
import styled from "styled-components";
import healthy from "assets/status-healthy.png";
import Icon from "components/porter/Icon";
import { z } from "zod";
import { PorterApp } from "@porter-dev/api-contracts";

type Props = {};

const PreviewEnvironmentSettings: React.FC<Props> = ({}) => {
  const { porterApp, clusterId, projectId } = useLatestRevision();

  const { data: templateExists, status } = useQuery(
    ["getAppTemplate", projectId, clusterId, porterApp.name],
    async () => {
      try {
        const res = await api.getAppTemplate(
          "<token>",
          {},
          {
            project_id: projectId,
            cluster_id: clusterId,
            porter_app_name: porterApp.name,
          }
        );

        const data = await z
          .object({
            template_b64_app_proto: z.string(),
          })
          .parseAsync(res.data);

        return PorterApp.fromJsonString(atob(data.template_b64_app_proto), {
          ignoreUnknownFields: true,
        });
      } catch (err) {
        return null;
      }
    }
  );

  const { githubWorkflowFilename, isLoading } = useGithubWorkflow({
    porterApp,
    fileNames: [`porter_preview_${porterApp.name}.yml`],
  });

  if (status === "loading" || isLoading) {
    return null;
  }

  return (
    <>
      {templateExists && githubWorkflowFilename ? (
        <EnabledContainer>
          <Text size={16}>Preview Environments Enabled</Text>
          <Icon src={healthy} />
        </EnabledContainer>
      ) : (
        <Text size={16}>
          Enable preview environments for "{porterApp.name}"
        </Text>
      )}
      <Spacer y={0.5} />
      <Text color="helper">
        {templateExists && githubWorkflowFilename
          ? "Preview environments are enabled for this app"
          : "Setup your app to automatically create preview environments for each pull request."}
      </Text>
      <Spacer y={0.5} />
      <Link to={`/preview-environments/configure?app_name=${porterApp.name}`}>
        <Button type="button">
          {templateExists && githubWorkflowFilename
            ? "Update Settings"
            : "Enable"}
        </Button>
      </Link>
      <Spacer y={1} />
    </>
  );
};

export default PreviewEnvironmentSettings;

const EnabledContainer = styled.div`
  display: flex;
  align-items: center;
  column-gap: 0.75rem;
`;
