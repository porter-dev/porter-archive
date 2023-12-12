import React, { useContext } from "react";
import { PorterApp } from "@porter-dev/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { match } from "ts-pattern";
import { z } from "zod";

import Loading from "components/Loading";
import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { LatestRevisionProvider } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import { type AppRevisionWithSource } from "main/home/app-dashboard/apps/types";

import api from "shared/api";
import { Context } from "shared/Context";
import pull_request_icon from "assets/pull_request_icon.svg";

import AppTemplateForm from "./AppTemplateForm";

type Props = {
  app: AppRevisionWithSource;
  onClose: () => void;
};

export const SetupPreviewAppModal: React.FC<Props> = ({ app, onClose }) => {
  const { currentCluster, currentProject } = useContext(Context);

  const templateRes = useQuery(
    ["getAppTemplate", currentProject?.id, currentCluster?.id, app.source.name],
    async () => {
      if (
        !currentProject ||
        !currentCluster ||
        currentCluster.id === -1 ||
        currentProject.id === -1
      ) {
        return null;
      }

      try {
        const res = await api.getAppTemplate(
          "<token>",
          {},
          {
            project_id: currentProject?.id,
            cluster_id: currentCluster?.id,
            porter_app_name: app.source.name,
          }
        );

        const data = await z
          .object({
            template_b64_app_proto: z.string(),
            app_env: z.object({
              variables: z.record(z.string()).default({}),
              secret_variables: z.record(z.string()).default({}),
            }),
          })
          .parseAsync(res.data);

        const template = PorterApp.fromJsonString(
          atob(data.template_b64_app_proto),
          {
            ignoreUnknownFields: true,
          }
        );

        return {
          template,
          env: data.app_env,
        };
      } catch (err) {
        return null;
      }
    },
    {
      enabled: !!currentProject && !!currentCluster,
      refetchOnWindowFocus: false,
    }
  );

  return (
    <LatestRevisionProvider appName={app.source.name} showLoader={false}>
      <Modal closeModal={onClose} width={"1000px"}>
        <Container row>
          <Icon height="18px" src={pull_request_icon} />
          <Spacer inline width="12px" />
          <Container>
            <Text size={16}>Setup Previews for {app.source.name}</Text>
            <Spacer y={0.25} />
            <Text color="helper">
              Set preview environment specific configuration for this
              application below. Any newly created preview environments will use
              these settings.
            </Text>
          </Container>
        </Container>
        <Spacer y={1} />
        {match(templateRes)
          .with({ status: "loading" }, () => <Loading />)
          .with({ status: "success" }, ({ data }) => {
            return (
              <AppTemplateForm
                existingTemplate={data}
                onCancel={() => {
                  onClose();
                }}
              />
            );
          })
          .otherwise(() => null)}
      </Modal>
    </LatestRevisionProvider>
  );
};
