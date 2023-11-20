import React from "react";
import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import { z } from "zod";

import CopyToClipboard from "components/CopyToClipboard";
import Loading from "components/Loading";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import YamlEditor from "components/YamlEditor";

import api from "shared/api";

import { useLatestRevision } from "../LatestRevisionContext";

type Props = {
  closeModal: () => void;
};

const ExportAppModal: React.FC<Props> = ({ closeModal }) => {
  const { porterApp, clusterId, projectId, latestRevision } =
    useLatestRevision();

  const { data: yamlResp } = useQuery(
    [
      "getExportablePorterYamlFromRevision",
      projectId,
      clusterId,
      latestRevision.id,
    ],
    async () => {
      const yamlResp = await api.porterYamlFromRevision(
        "<token>",
        {
          should_format_for_export: true,
        },
        {
          project_id: projectId,
          cluster_id: clusterId,
          porter_app_name: porterApp.name,
          revision_id: latestRevision.id,
        }
      );

      const parsedBase = z
        .object({ b64_porter_yaml: z.string() })
        .parse(yamlResp.data);
      const decodedBase = atob(parsedBase.b64_porter_yaml);

      return decodedBase;
    }
  );

  if (!yamlResp) {
    return (
      <Modal closeModal={closeModal}>
        <Loading />
      </Modal>
    );
  }

  return (
    <Modal closeModal={closeModal}>
      <Spacer y={1} />
      <StyledValuesYaml>
        <Wrapper>
          <YamlEditor
            value={yamlResp}
            height="calc(100vh - 412px)"
            readOnly={true}
          />
        </Wrapper>
        <CopyWrapper>
          Copy to clipboard:
          <Spacer inline x={0.25} />
          <CopyToClipboard
            as="i"
            text={yamlResp}
            wrapperProps={{
              className: "material-icons",
            }}
          >
            content_copy
          </CopyToClipboard>
        </CopyWrapper>
      </StyledValuesYaml>
    </Modal>
  );
};

export default ExportAppModal;

const Wrapper = styled.div`
  overflow: auto;
  border-radius: 8px;
  margin-bottom: 30px;
  border: 1px solid #ffffff33;
`;

const StyledValuesYaml = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 350px);
  font-size: 13px;
  overflow: hidden;
  border-radius: 8px;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const CopyWrapper = styled.div`
  display: flex;
  justify-content: flex-end;
`;
