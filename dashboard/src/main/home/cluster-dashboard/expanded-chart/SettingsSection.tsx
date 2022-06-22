import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import api from "shared/api";
import yaml from "js-yaml";

import { ActionConfigType, ChartType, StorageType } from "shared/types";
import { Context } from "shared/Context";

import ImageSelector from "components/image-selector/ImageSelector";
import SaveButton from "components/SaveButton";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import _ from "lodash";
import CopyToClipboard from "components/CopyToClipboard";
import useAuth from "shared/auth/useAuth";
import Loading from "components/Loading";
import NotificationSettingsSection from "./NotificationSettingsSection";
import { Link } from "react-router-dom";
import { isDeployedFromGithub } from "shared/release/utils";
import TagSelector from "./TagSelector";
import { PORTER_IMAGE_TEMPLATES } from "shared/common";

type PropsType = {
  currentChart: ChartType;
  refreshChart: () => Promise<void>;
  setShowDeleteOverlay: (x: boolean) => void;
  saveButtonText?: string | null;
};

const SettingsSection: React.FC<PropsType> = ({
  currentChart,
  refreshChart,
  setShowDeleteOverlay,
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
        {},
        {
          id: currentProject.id,
          name: currentChart?.name,
          namespace: currentChart?.namespace,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        if (!isSubscribed) {
          return;
        }

        setWebhookToken(res.data.webhook_token);
      })
      .catch(console.log)
      .finally(() => setLoadingWebhookToken(false));

    return () => {
      isSubscribed = false;
    };
  }, [currentChart, currentCluster, currentProject]);

  const handleSubmit = async () => {
    setSaveValuesStatus("loading");

    // console.log(selectedImageUrl);

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
          values: conf,
        },
        {
          id: currentProject.id,
          name: currentChart?.name,
          namespace: currentChart?.namespace,
          cluster_id: currentCluster.id,
        }
      );
      setSaveValuesStatus("successful");
      refreshChart();
    } catch (err) {
      let parsedErr = err?.response?.data?.error;

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
        }
      );
      setCreateWebhookButtonStatus("successful");
      setTimeout(() => {
        setWebhookToken(res.data.webhook_token);
      }, 500);
    } catch (err) {
      let parsedErr = err?.response?.data?.error;

      if (parsedErr) {
        err = parsedErr;
      }

      setCreateWebhookButtonStatus(parsedErr);
      setCurrentError(parsedErr);
    }
  };

  const getCloneUrl = () => {
    const params = new URLSearchParams();
    params.append("project_id", currentProject.id.toString());
    params.append("shouldClone", "true");
    params.append("release_namespace", currentChart.namespace);
    params.append(
      "release_template_version",
      currentChart.chart.metadata.version
    );
    params.append("release_type", currentChart.chart.metadata.name);
    params.append("release_name", currentChart.name);
    params.append("release_version", currentChart.version.toString());
    return `/launch?${params.toString()}`;
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
    console.log(PORTER_IMAGE_TEMPLATES.includes(selectedImageUrl));
    return (
      <>
        {!currentChart.is_stack &&
        !PORTER_IMAGE_TEMPLATES.includes(selectedImageUrl) ? (
          <>
            <Heading>Source Settings</Heading>
            <Helper>Specify an image tag to use.</Helper>
            <ImageSelector
              selectedTag={selectedTag}
              selectedImageUrl={selectedImageUrl}
              setSelectedImageUrl={(x: string) => setSelectedImageUrl(x)}
              setSelectedTag={(x: string) => setSelectedTag(x)}
              forceExpanded={true}
              disableImageSelect={false}
            />
            {!loadingWebhookToken && (
              <>
                <Br />
                <Br />
                <Br />
                <SaveButton
                  clearPosition={true}
                  statusPosition="right"
                  text="Save Source Settings"
                  status={saveValuesStatus}
                  onClick={handleSubmit}
                />
              </>
            )}
            <Br />
          </>
        ) : null}

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
        <Heading>Application Tags</Heading>
        <Helper>Add tags for filtering applications.</Helper>
        <TagSelector release={currentChart} onSave={(val) => refreshChart()} />
      </>
    );
  };

  const canBeCloned = () => {
    if (isDeployedFromGithub(currentChart)) {
      return false;
    }

    // If its not web worker or job it means is an addon, and for now it's not supported
    if (
      !["web", "worker", "job"].includes(currentChart?.chart?.metadata?.name)
    ) {
      return false;
    }

    return true;
  };

  return (
    <Wrapper>
      {!loadingWebhookToken ? (
        <StyledSettingsSection>
          {renderWebhookSection()}
          <NotificationSettingsSection currentChart={currentChart} />
          {/* Prevent the clone button to be rendered in github deployed charts */}
          {canBeCloned() && (
            <>
              <Heading>Clone deployment</Heading>
              <Helper>
                Click the button below to be redirected to the deploy form with
                all the data prefilled
              </Helper>
              <CloneButton as={Link} to={getCloneUrl()}>
                Clone
              </CloneButton>
            </>
          )}

          <Heading>Additional Settings</Heading>

          <Button color="#b91133" onClick={() => setShowDeleteOverlay(true)}>
            Delete {currentChart.name}
          </Button>
        </StyledSettingsSection>
      ) : (
        <Loading />
      )}
    </Wrapper>
  );
};

export default SettingsSection;

const DarkMatter = styled.div`
  width: 100%;
  height: 0;
  margin-top: -10px;
`;

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

const CloneButton = styled(Button)`
  display: flex;
  width: min-content;
  align-items: center;
  justify-content: center;
  background-color: #ffffff11;
  :hover {
    background-color: #ffffff18;
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

const StyledSettingsSection = styled.div`
  width: 100%;
  background: #ffffff11;
  padding: 0 35px;
  padding-bottom: 15px;
  position: relative;
  border-radius: 8px;
  overflow: auto;
  height: calc(100% - 55px);
`;

const Holder = styled.div`
  padding: 0px 12px;
`;
