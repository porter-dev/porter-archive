import React, { Component, useContext, useEffect, useState } from "react";
import styled from "styled-components";
import api from "shared/api";
import yaml from "js-yaml";

import {
  ChartType,
  RepoType,
  StorageType,
  ActionConfigType,
} from "shared/types";
import { Context } from "shared/Context";

import ImageSelector from "components/image-selector/ImageSelector";
import SaveButton from "components/SaveButton";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import _ from "lodash";
import CopyToClipboard from "components/CopyToClipboard";
import useAuth from "shared/auth/useAuth";
import Loading from "components/Loading";

type PropsType = {
  currentChart: ChartType;
  refreshChart: () => void;
  setShowDeleteOverlay: (x: boolean) => void;
  showSource?: boolean;
  saveButtonText?: string | null;
};

const SettingsSection: React.FC<PropsType> = ({
  currentChart,
  refreshChart,
  setShowDeleteOverlay,
  showSource,
  saveButtonText,
}) => {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>("");
  const [selectedTag, setSelectedTag] = useState<string | null>("");
  const [saveValuesStatus, setSaveValuesStatus] = useState<string | null>(null);
  const [highlightCopyButton, setHighlightCopyButton] = useState<boolean>(
    false
  );
  const [webhookToken, setWebhookToken] = useState<string>("");
  const [
    createWebhookButtonStatus,
    setCreateWebhookButtonStatus,
  ] = useState<string>("");
  const [loadingWebhookToken, setLoadingWebhookToken] = useState<boolean>(true);

  const [action, setAction] = useState<ActionConfigType>({
    git_repo: "",
    image_repo_uri: "",
    git_repo_id: 0,
    branch: "",
  });

  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );
  const [isAuthorized] = useAuth();

  useEffect(() => {
    let isSubscribed = true;
    setLoadingWebhookToken(true);
    const image = currentChart?.config?.image;
    setSelectedImageUrl(image?.repository);
    setSelectedTag(image?.tag);

    api
      .getReleaseToken(
        "<token>",
        {
          namespace: currentChart?.namespace,
          cluster_id: currentCluster.id,
          storage: StorageType.Secret,
        },
        { id: currentProject.id, name: currentChart?.name }
      )
      .then((res) => {
        if (!isSubscribed) {
          return;
        }

        setAction(res.data.git_action_config);
        setWebhookToken(res.data.webhook_token);
      })
      .catch(console.log)
      .finally(() => setLoadingWebhookToken(false));

    return () => (isSubscribed = false);
  }, [currentChart, currentCluster, currentProject]);

  const handleSubmit = async () => {
    setSaveValuesStatus("loading");

    console.log(selectedImageUrl);

    let values = {};
    if (selectedTag) {
      _.set(values, "image.repository", selectedImageUrl);
      _.set(values, "image.tag", selectedTag);
    }

    // if this is a job, set it to paused
    if (currentChart?.chart?.metadata?.name == "job") {
      _.set(values, "paused", true);
    }

    // Weave in preexisting values and convert to yaml
    let conf = yaml.dump(
      {
        ...(currentChart?.config as Object),
        ...values,
      },
      { forceQuotes: true }
    );

    try {
      await api.upgradeChartValues(
        "<token>",
        {
          namespace: currentChart?.namespace,
          storage: StorageType.Secret,
          values: conf,
        },
        {
          id: currentProject.id,
          name: currentChart?.name,
          cluster_id: currentCluster.id,
        }
      );
      setSaveValuesStatus("successful");
      refreshChart();
    } catch (err) {
      let parsedErr =
        err?.response?.data?.errors && err.response.data.errors[0];

      if (parsedErr) {
        err = parsedErr;
      }

      setSaveValuesStatus(parsedErr);
      setCurrentError(parsedErr);
    }
  };

  const handleCreateWebhookToken = async () => {
    setCreateWebhookButtonStatus("loading");
    const { id: cluster_id } = currentCluster;
    const { id: project_id } = currentProject;
    const { name: chart_name, namespace } = currentChart;
    try {
      const res = await api.createWebhookToken(
        "<token>",
        {},
        {
          project_id,
          chart_name,
          namespace,
          cluster_id,
          storage: StorageType.Secret,
        }
      );
      setCreateWebhookButtonStatus("successful");
      setTimeout(() => {
        setAction(res.data.git_action_config);
        setWebhookToken(res.data.webhook_token);
      }, 500);
    } catch (err) {
      let parsedErr =
        err?.response?.data?.errors && err.response.data.errors[0];

      if (parsedErr) {
        err = parsedErr;
      }

      setCreateWebhookButtonStatus(parsedErr);
      setCurrentError(parsedErr);
    }
  };

  const renderWebhookSection = () => {
    if (!currentChart?.form?.hasSource) {
      return;
    }

    const protocol = window.location.protocol == "https:" ? "https" : "http";

    const url = `${protocol}://${window.location.host}`;

    const curlWebhook = `curl -X POST '${url}/api/webhooks/deploy/${webhookToken}?commit=YOUR_COMMIT_HASH'`;

    const isAuthorizedToCreateWebhook = isAuthorized("application", "", [
      "get",
      "create",
      "update",
    ]);

    let buttonStatus = createWebhookButtonStatus;

    if (!isAuthorizedToCreateWebhook) {
      buttonStatus = "Unauthorized to create webhook token";
    }

    return (
      <>
        {showSource && (
          <>
            <Heading>Source Settings</Heading>
            <Helper>Specify an image tag to use.</Helper>
            <ImageSelector
              selectedTag={selectedTag}
              selectedImageUrl={selectedImageUrl}
              setSelectedImageUrl={(x: string) => setSelectedImageUrl(x)}
              setSelectedTag={(x: string) => setSelectedTag(x)}
              forceExpanded={true}
              disableImageSelect={true}
            />
            <Br />
          </>
        )}

        <>
          <Heading>Redeploy Webhook</Heading>
          <Helper>
            Programmatically deploy by calling this secret webhook.
          </Helper>

          {!loadingWebhookToken && !webhookToken.length && (
            <SaveButton
              text={"Create Webhook"}
              status={buttonStatus}
              onClick={handleCreateWebhookToken}
              clearPosition={true}
              statusPosition={"right"}
              disabled={!isAuthorizedToCreateWebhook}
            />
          )}
          {webhookToken.length > 0 && (
            <Webhook copiedToClipboard={highlightCopyButton}>
              <div>{curlWebhook}</div>
              <CopyToClipboard
                as="i"
                text={curlWebhook}
                onSuccess={() => setHighlightCopyButton(true)}
                wrapperProps={{
                  className: "material-icons",
                  onMouseLeave: () => setHighlightCopyButton(false),
                }}
              >
                content_copy
              </CopyToClipboard>
            </Webhook>
          )}
        </>
      </>
    );
  };

  return (
    <Wrapper>
      {!loadingWebhookToken ? (
        <StyledSettingsSection showSource={showSource}>
          {renderWebhookSection()}
          <Heading>Additional Settings</Heading>
          <Button color="#b91133" onClick={() => setShowDeleteOverlay(true)}>
            Delete {currentChart.name}
          </Button>
        </StyledSettingsSection>
      ) : (
        <Loading />
      )}
      {!loadingWebhookToken && showSource && (
        <SaveButton
          text={saveButtonText || "Save Config"}
          status={saveValuesStatus}
          onClick={handleSubmit}
          makeFlush={true}
        />
      )}
    </Wrapper>
  );
};

export default SettingsSection;

const Br = styled.div`
  width: 100%;
  height: 10px;
`;

const Button = styled.button`
  height: 35px;
  font-size: 13px;
  margin-top: 20px;
  margin-bottom: 30px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  padding: 6px 20px 7px 20px;
  text-align: left;
  border: 0;
  border-radius: 5px;
  background: ${(props) => (!props.disabled ? props.color : "#aaaabb")};
  box-shadow: ${(props) =>
    !props.disabled ? "0 2px 5px 0 #00000030" : "none"};
  cursor: ${(props) => (!props.disabled ? "pointer" : "default")};
  user-select: none;
  :focus {
    outline: 0;
  }
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
  }
`;

const Webhook = styled.div`
  width: 100%;
  border: 1px solid #ffffff55;
  background: #ffffff11;
  border-radius: 3px;
  display: flex;
  align-items: center;
  font-size: 13px;
  padding-left: 10px;
  color: #aaaabb;
  height: 40px;
  position: relative;
  margin-bottom: 40px;

  > div {
    user-select: all;
  }

  > i {
    padding: 5px;
    background: ${(props: { copiedToClipboard: boolean }) =>
      props.copiedToClipboard ? "#616FEEcc" : "#ffffff22"};
    border-radius: 5px;
    position: absolute;
    right: 10px;
    font-size: 14px;
    cursor: pointer;
    color: #ffffff;

    :hover {
      background: ${(props: { copiedToClipboard: boolean }) =>
        props.copiedToClipboard ? "" : "#ffffff44"};
    }
  }
`;

const Highlight = styled.div`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;
  cursor: pointer;
  padding-right: ${(props: { padRight?: boolean }) =>
    props.padRight ? "5px" : ""};
`;

const A = styled.a`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;
  cursor: pointer;
  padding-right: ${(props: { padRight?: boolean }) =>
    props.padRight ? "5px" : ""};
`;

const Wrapper = styled.div`
  width: 100%;
  padding-bottom: 65px;
  height: 100%;
`;

const StyledSettingsSection = styled.div<{ showSource: boolean }>`
  width: 100%;
  background: #ffffff11;
  padding: 0 35px;
  padding-bottom: 15px;
  position: relative;
  border-radius: 8px;
  overflow: auto;
  height: ${(props) => (props.showSource ? "calc(100% - 55px)" : "100%")};
`;

const Holder = styled.div`
  padding: 0px 12px;
`;
