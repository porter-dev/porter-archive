import Heading from "components/form-components/Heading";
import InputRow from "components/form-components/InputRow";
import SaveButton from "components/SaveButton";
import React, { useContext, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import styled from "styled-components";

const URLRegex = /(http(s)?):\/\/[(www\.)?a-zA-Z0-9@:%._\+~#=\-]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;

type Props = {
  closeForm: () => void;
};

const GitlabForm: React.FC<Props> = () => {
  const { currentProject } = useContext(Context);
  const [instanceUrl, setInstanceUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<{
    message: string;
    input: "client_id" | "client_secret" | "instance_url";
  }>(null);

  const [buttonStatus, setButtonStatus] = useState("");

  const { pushFiltered } = useRouting();

  const submit = async () => {
    if (!URLRegex.test(instanceUrl)) {
      if (!instanceUrl.includes("http") || !instanceUrl.includes("https")) {
        setError({
          message:
            "Invalid URL, please make sure the URL contains the http/s protocol.",
          input: "instance_url",
        });
        return;
      }

      setError({
        message: "Invalid URL, please check again.",
        input: "instance_url",
      });
      return;
    }

    if (!clientId || !clientId.trim().length) {
      setError({
        message: "Invalid Client ID",
        input: "client_id",
      });
      return;
    }

    if (!clientSecret || !clientSecret.trim().length) {
      setError({
        message: "Invalid Client Secret",
        input: "client_secret",
      });
      return;
    }

    setError(null);

    setButtonStatus("loading");

    try {
      await api.createGitlabIntegration(
        "<token>",
        {
          instance_url: instanceUrl,
          client_id: clientId,
          client_secret: clientSecret,
        },
        { id: currentProject.id }
      );

      setButtonStatus("successful");
      pushFiltered(`/integrations/gitlab`, ["project_id"]);
    } catch (error) {
      setButtonStatus("Couldn't save the instance. Please try again.");
    } finally {
      setTimeout(() => {
        setButtonStatus("");
      }, 1000);
    }
  };

  return (
    <>
      <StyledForm>
        <CredentialWrapper>
          <Heading>GitLab Instance Settings</Heading>

          <InputRow
            type="string"
            label="Instance URL"
            value={instanceUrl}
            setValue={(val: string) => setInstanceUrl(val)}
            isRequired
            width="100%"
            hasError={error?.input === "instance_url"}
          />
          <InputRow
            type="string"
            label="Client Application ID"
            value={clientId}
            setValue={(val: string) => setClientId(val)}
            isRequired
            width="100%"
            hasError={error?.input === "client_id"}
          />
          <InputRow
            type="string"
            label="Client Secret"
            value={clientSecret}
            setValue={(val: string) => setClientSecret(val)}
            isRequired
            width="100%"
            hasError={error?.input === "client_secret"}
          />
        </CredentialWrapper>
        <SaveButton
          onClick={submit}
          makeFlush={true}
          text="Save Gitlab Settings"
          status={buttonStatus || error?.message}
        />
      </StyledForm>
    </>
  );
};

export default GitlabForm;

const CredentialWrapper = styled.div`
  padding: 5px 40px 25px;
  background: #ffffff11;
  border-radius: 5px;
`;

const StyledForm = styled.div`
  position: relative;
  padding-bottom: 75px;
`;
