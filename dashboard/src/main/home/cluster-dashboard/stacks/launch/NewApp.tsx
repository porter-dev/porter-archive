import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import Loading from "components/Loading";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";
import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import api from "shared/api";
import { useRouting } from "shared/routing";
import { ExpandedPorterTemplate } from "shared/types";
import { StacksLaunchContext } from "./Store";

const NewApp = () => {
  const { addAppResource, newStack } = useContext(StacksLaunchContext);

  const params = useParams<{
    template_name: string;
    version: string;
  }>();

  const [template, setTemplate] = useState<ExpandedPorterTemplate>();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [saveButtonStatus, setSaveButtonStatus] = useState("");

  const [appName, setAppName] = useState("");

  const { pushFiltered } = useRouting();

  useEffect(() => {
    let isSubscribed = true;
    if (!params.template_name || !params.version) {
      return () => {
        isSubscribed = false;
      };
    }

    setHasError(false);

    api
      .getTemplateInfo<ExpandedPorterTemplate>(
        "<token>",
        {},
        { name: params.template_name, version: params.version }
      )
      .then((res) => {
        if (isSubscribed) {
          setTemplate(res.data);
        }
      })
      .catch((err) => {
        setHasError(true);
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [params]);

  if (isLoading) {
    return <Loading />;
  }

  if (hasError) {
    return <>Unexpected error</>;
  }

  const handleSubmit = (values: any) => {
    if (appName === "") {
      setSaveButtonStatus("App name cannot be empty");
      return;
    }

    addAppResource({
      name: appName,
      source_config_name: newStack.source_configs[0]?.name || "",
      template_name: params.template_name,
      template_version: params.version,
      values,
    });

    setSaveButtonStatus("successful");
    setTimeout(() => {
      setSaveButtonStatus("");
      pushFiltered("/stacks/launch/overview", []);
    }, 1000);
  };

  return (
    <div style={{ position: "relative" }}>
      <Helper>App name</Helper>
      <InputRow
        type="string"
        value={appName}
        setValue={(val: string) => setAppName(val)}
        width={"300px"}
      />
      <Helper>App settings</Helper>
      <PorterFormWrapper
        formData={template.form}
        onSubmit={handleSubmit}
        isLaunch
        saveValuesStatus={saveButtonStatus}
        saveButtonText="Add application"
      />
    </div>
  );
};

export default NewApp;
