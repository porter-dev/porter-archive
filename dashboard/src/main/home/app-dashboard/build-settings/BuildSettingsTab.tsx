import React, {
  useContext,
  useState,
} from "react";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import { PorterAppOptions } from "shared/types";
import { Context } from "shared/Context";

import api from "shared/api";
import { AxiosError } from "axios";
import Button from "components/porter/Button";
import Checkbox from "components/porter/Checkbox";
import SharedBuildSettings from "./SharedBuildSettings";
import { PorterApp } from "../types/porterApp";
import _ from "lodash";

type Props = {
  porterApp: PorterApp;
  setTempPorterApp: (app: PorterApp) => void;
  updatePorterApp: (options: Partial<PorterAppOptions>) => Promise<void>;
  clearStatus: () => void;
};

const BuildSettingsTab: React.FC<Props> = ({
  porterApp,
  setTempPorterApp,
  clearStatus,
  updatePorterApp,
}) => {
  const { setCurrentError, currentCluster, currentProject } = useContext(Context);
  const [redeployOnSave, setRedeployOnSave] = useState(true);
  const [runningWorkflowURL, setRunningWorkflowURL] = useState("");

  const [buttonStatus, setButtonStatus] = useState<
    "loading" | "success" | string
  >("");

  const triggerWorkflow = async () => {
    try {
      if (currentProject == null || currentCluster == null) {
        return;
      }

      const res = await api.reRunGHWorkflow(
        "",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          git_installation_id: porterApp.git_repo_id,
          owner: porterApp.repo_name?.split("/")[0],
          name: porterApp.repo_name?.split("/")[1],
          branch: porterApp.git_branch,
          filename: "porter_stack_" + porterApp.name + ".yml",
        }
      );
      if (res.data != null) {
        window.open(res.data, "_blank", "noreferrer")
      }
    } catch (error) {
      if (!error?.response) {
        throw error;
      }

      let tmpError: AxiosError = error;

      /**
       * @smell
       * Currently the expanded chart is clearing all the state when a chart update is triggered (saveEnvVariables).
       * Temporary usage of setCurrentError until a context is applied to keep the state of the ReRunError during re renders.
       */

      if (tmpError.response.status === 400) {
        // setReRunError({
        //   title: "No previous run found",
        //   description:
        //     "There are no previous runs for this workflow, please trigger manually a run before changing the build settings.",
        // });
        setCurrentError(
          "There are no previous runs for this workflow. Please manually trigger a run before changing build settings."
        );
        return;
      }

      if (tmpError.response.status === 409) {
        // setReRunError({
        //   title: "The workflow is still running",
        //   description:
        //     'If you want to make more changes, please choose the option "Save" until the workflow finishes.',
        // });

        if (typeof tmpError.response.data === "string") {
          setRunningWorkflowURL(tmpError.response.data);
        }
        setCurrentError(
          'The workflow is still running. You can "Save" the current build settings for the next workflow run and view the current status of the workflow here: ' +
          tmpError.response.data
        );
        return;
      }

      if (tmpError.response.status === 404) {
        let description = "No action file matching this deployment was found.";
        if (typeof tmpError.response.data === "string") {
          const filename = tmpError.response.data;
          description = description.concat(
            `Please check that the file "${filename}" exists in your repository.`
          );
        }
        // setReRunError({
        //   title: "The action doesn't seem to exist",
        //   description,
        // });

        setCurrentError(description);
        return;
      }
      throw error;
    }
  };

  const saveConfig = async () => {
    try {
      await updatePorterApp({});
    } catch (err) {
      console.log(err);
    }
  };

  const handleSave = async () => {
    setButtonStatus("loading");

    try {
      await saveConfig();
      setButtonStatus("success");
    } catch (error) {
      setButtonStatus("Something went wrong");
      console.log(error);
    }
  };

  const handleSaveAndReDeploy = async () => {
    setButtonStatus("loading");

    try {
      await saveConfig();
      await triggerWorkflow();
      setButtonStatus("success");
      clearStatus();
    } catch (error) {
      setButtonStatus("Something went wrong");
      console.log(error);
    }
  };
  return (
    <>
      <SharedBuildSettings
        porterApp={porterApp}
        updatePorterApp={(attrs: Partial<PorterApp>) => setTempPorterApp(PorterApp.setAttributes(porterApp, attrs))}
        setPorterYaml={() => { }}
        autoDetectionOn={false}
        canChangeRepo={false}
      />
      <Spacer y={1} />
      <Checkbox
        checked={redeployOnSave}
        toggleChecked={() => setRedeployOnSave(!redeployOnSave)}
      >
        <Text>Re-run build and deploy on save</Text>
      </Checkbox>
      <Spacer y={1} />
      <Button
        onClick={() => {
          if (redeployOnSave) {
            handleSaveAndReDeploy();
          } else {
            handleSave();
          }
        }}
        status={buttonStatus}
      >
        Save build settings
      </Button>
    </>
  );
};

export default BuildSettingsTab;
