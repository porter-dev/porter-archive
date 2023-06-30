import { useQuery } from "@tanstack/react-query";
import Button from "components/porter/Button";
import Banner from "components/porter/Banner";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import React, { useEffect, useMemo, useState } from "react";
import { useContext } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import { z } from "zod";
import loadingSrc from "assets/loading.gif";
import { Environment } from "main/home/cluster-dashboard/preview-environments/types";

type Props = {
  appName: string;
  repoName: string;
};

export const PreviewEnvSettings: React.FC<Props> = ({ appName, repoName }) => {
  const { currentProject, currentCluster } = useContext(Context);
  const { pushFiltered, push } = useRouting();

  const { data: environments, status } = useQuery<Environment[]>(
    ["listEnvironments", currentProject?.id, currentCluster?.id],
    async () => {
      const inputSchema = z.object({
        project_id: z.number(),
        cluster_id: z.number(),
      });

      const input = await inputSchema.parseAsync({
        project_id: currentProject?.id,
        cluster_id: currentCluster?.id,
      });

      const { data } = await api.listEnvironments("<token>", {}, input);
      return data;
    }
  );

  console.log("repoName", repoName);

  const [
    showPreviewDisabledBanner,
    setShowPreviewDisabledBanner,
  ] = useState<boolean>(false);

  const alreadyEnabled = useMemo(
    () =>
      environments?.some(
        (e) => `${e.git_repo_owner}/${e.git_repo_name}` === repoName
      ),
    [environments, repoName]
  );

  useEffect(() => {
    if (showPreviewDisabledBanner) {
      setTimeout(() => {
        setShowPreviewDisabledBanner(false);
      }, 5000);
    }
  }, [showPreviewDisabledBanner]);

  return (
    <>
      {showPreviewDisabledBanner && (
        <Banner type="error">
          Preview Envs are disabled for this cluster.
          <StyledLink
            onClick={() => {
              pushFiltered("/cluster-dashboard", ["project_id"], {
                cluster: currentCluster?.name,
                project_id: currentProject?.id,
                selected_tab: "settings",
              });
            }}
          >
            Enable on Cluster
          </StyledLink>
        </Banner>
      )}
      {status !== "error" && (
        <>
          <Text size={16}>Enable Preview Environments</Text>
          <Spacer y={0.25} />
          <Text color="helper">Setup Preview Environments for "{appName}"</Text>
          <Spacer y={1} />
          <Button
            onClick={() => {
              if (!currentCluster?.preview_envs_enabled) {
                setShowPreviewDisabledBanner(true);
                return;
              }
              push(
                `/preview-environments/connect-repo?selected_repo=${repoName}`
              );
            }}
            disabled={status === "loading" || alreadyEnabled}
          >
            {status === "loading" ? (
              <Spinner src={loadingSrc} />
            ) : alreadyEnabled ? (
              "Enabled!"
            ) : (
              "Enable"
            )}
          </Button>
        </>
      )}
      <Spacer y={1} />
    </>
  );
};

const StyledLink = styled.div`
  cursor: pointer;
  :hover {
    font-weight: 500;
  }
  text-decoration: underline;
  margin-left: 7px;
`;

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 12px;
  margin-bottom: -2px;
`;
