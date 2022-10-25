import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { InviteType } from "shared/types";
import api from "shared/api";
import { Context } from "shared/Context";
import backArrow from "assets/back_arrow.png";

import Loading from "components/Loading";
import InputRow from "components/form-components/InputRow";
import Helper from "components/form-components/Helper";
import Heading from "components/form-components/Heading";
import CopyToClipboard from "components/CopyToClipboard";
import { Column } from "react-table";
import Table from "components/OldTable";
import RadioSelector from "components/RadioSelector";
import SelectRow from "components/form-components/SelectRow";
import SaveButton from "components/SaveButton";
import { APIToken } from "../APITokensSection";
import CustomPolicyForm from "./CustomPolicyForm";
import { PolicyDocType, Verbs } from "shared/auth/types";

type Props = {
  onCreate: () => void;
  back: () => void;
};

const getDateValue = (option: string): string => {
  let now = new Date();

  switch (option) {
    case "oneday":
      return new Date(new Date().setHours(now.getHours() + 24)).toISOString();
    case "threedays":
      return new Date(
        new Date().setHours(now.getHours() + 24 * 3)
      ).toISOString();
    case "sevendays":
      return new Date(
        new Date().setHours(now.getHours() + 24 * 7)
      ).toISOString();
    case "thirtydays":
      return new Date(
        new Date().setHours(now.getHours() + 24 * 30)
      ).toISOString();
    case "oneyear":
      return new Date(
        new Date().setHours(now.getHours() + 24 * 365)
      ).toISOString();
    default:
      return "";
  }
};

export const getDateOptions = (): { value: string; label: string }[] => {
  return [
    {
      label: "1 Day",
      value: "oneday",
    },
    {
      label: "3 Days",
      value: "threedays",
    },
    {
      label: "7 Days",
      value: "sevendays",
    },
    {
      label: "30 Days",
      value: "thirtydays",
    },
    {
      label: "1 Year",
      value: "oneyear",
    },
  ];
};

export type ScopeOption = {
  value: string;
  label: string;
};

const CreateAPITokenForm: React.FunctionComponent<Props> = ({
  onCreate,
  back,
}) => {
  const { currentProject } = useContext(Context);
  const [apiTokenName, setAPITokenName] = useState("");
  const dateOptions = getDateOptions();
  const [expiration, setExpiration] = useState("thirtydays");
  const [policy, setPolicy] = useState("developer");
  const [createdToken, setCreatedToken] = useState<APIToken>(null);
  const [copied, setCopied] = useState(false);
  const [selectedClusterFields, setSelectedClusterFields] = useState<
    ScopeOption[]
  >([]);
  const [selectedRegistryFields, setSelectedRegistryFields] = useState<
    ScopeOption[]
  >([]);
  const [selectedInfraFields, setSelectedInfraFields] = useState<ScopeOption[]>(
    []
  );
  const [selectedSettingsFields, setSelectedSettingsFields] = useState<
    ScopeOption[]
  >([]);
  const [policyName, setPolicyName] = useState("");

  const createToken = () => {
    let cb = (policyUID: string) => {
      api
        .createAPIToken(
          "<token>",
          {
            name: apiTokenName,
            expires_at: getDateValue(expiration),
            policy_uid: policyUID || policy,
          },
          { project_id: currentProject.id }
        )
        .then(({ data }) => {
          setCreatedToken(data);
        })
        .catch((err) => {
          console.error(err);
        });
    };

    if (policy == "admin" || policy == "developer" || policy == "viewer") {
      cb(policy);
    } else {
      createPolicy(cb);
    }
  };

  const getVerbsForScope = (
    scopeVal: string,
    allSelected: string[]
  ): Verbs[] => {
    if (scopeVal.includes("read")) {
      return allSelected.includes(scopeVal) ? ["get", "list"] : [];
    } else if (scopeVal.includes("write")) {
      return allSelected.includes(scopeVal)
        ? ["create", "update", "delete"]
        : [];
    } else {
      return [];
    }
  };

  const createPolicy = (cb?: (id: string) => void) => {
    let allSelectedFields = selectedClusterFields.concat(
      ...selectedRegistryFields,
      ...selectedInfraFields,
      ...selectedSettingsFields
    );

    let allSelectedValues = allSelectedFields.map((field) => field.value);

    // construct the policy
    let policy: PolicyDocType = {
      scope: "project",
      verbs: [],
      children: {
        cluster: {
          scope: "cluster",
          verbs: [],
          children: {
            namespace: {
              scope: "namespace",
              verbs: getVerbsForScope(
                "namespace-read",
                allSelectedValues
              ).concat(getVerbsForScope("namespace-write", allSelectedValues)),
              children: {
                release: {
                  scope: "release",
                  verbs: getVerbsForScope(
                    "release-read",
                    allSelectedValues
                  ).concat(
                    getVerbsForScope("release-write", allSelectedValues)
                  ),
                },
              },
            },
          },
        },
        registry: {
          scope: "registry",
          verbs: getVerbsForScope("registry-read", allSelectedValues).concat(
            getVerbsForScope("registry-write", allSelectedValues)
          ),
        },
        infra: {
          scope: "infra",
          verbs: getVerbsForScope("infra-read", allSelectedValues).concat(
            getVerbsForScope("infra-write", allSelectedValues)
          ),
        },
        settings: {
          scope: "settings",
          verbs: getVerbsForScope("settings-read", allSelectedValues).concat(
            getVerbsForScope("settings-write", allSelectedValues)
          ),
        },
      },
    };

    api
      .createPolicy(
        "<token>",
        {
          name: policyName,
          policy: [policy],
        },
        { project_id: currentProject.id }
      )
      .then(({ data }) => {
        console.log("data response is", data);
        cb && cb(data?.uid);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  if (createdToken != null) {
    return (
      <CreateTokenWrapper>
        <ControlRow>
          <Heading isAtTop={true}>API token created successfully!</Heading>
          <BackButton>
            <BackButtonImg src={backArrow} />
          </BackButton>
        </ControlRow>
        <Helper>
          Please copy this token and store it in a secure location. This token
          will only be shown once:
        </Helper>
        <TokenDisplayBlock>
          <CodeBlock>{createdToken.token}</CodeBlock>
          <CopyToClipboard
            as={CopyTokenButton}
            text={createdToken.token}
            onSuccess={() => setCopied(true)}
          >
            <i className="material-icons-outlined">
              {copied ? "check" : "content_copy"}
            </i>
          </CopyToClipboard>
        </TokenDisplayBlock>
        <SaveButton
          text="Continue"
          onClick={onCreate}
          makeFlush={true}
          clearPosition={true}
        />
      </CreateTokenWrapper>
    );
  }

  const renderPolicyContents = () => {
    if (policy === "custom") {
      return (
        <CustomPolicyForm
          selectedClusterFields={selectedClusterFields}
          setSelectedClusterFields={setSelectedClusterFields}
          selectedRegistryFields={selectedRegistryFields}
          setSelectedRegistryFields={setSelectedRegistryFields}
          selectedInfraFields={selectedInfraFields}
          setSelectedInfraFields={setSelectedInfraFields}
          selectedSettingsFields={selectedSettingsFields}
          setSelectedSettingsFields={setSelectedSettingsFields}
          policyName={policyName}
          setPolicyName={setPolicyName}
        />
      );
    }
  };

  return (
    <CreateTokenWrapper>
      <ControlRow>
        <Heading isAtTop={true}>Create API Token</Heading>
        <BackButton onClick={back}>
          <BackButtonImg src={backArrow} />
        </BackButton>
      </ControlRow>
      <InputRow
        value={apiTokenName}
        type="text"
        setValue={(newName: string) => setAPITokenName(newName)}
        label="API Token Name"
        width="100%"
        placeholder="ex: api-token-admin"
        isRequired={true}
      />
      <SelectRow
        value={expiration}
        label="Expiration"
        setActiveValue={setExpiration}
        options={dateOptions}
      />
      <SelectRow
        value={policy}
        label="Role"
        setActiveValue={setPolicy}
        options={[
          {
            label: "Admin",
            value: "admin",
          },
          {
            label: "Developer",
            value: "developer",
          },
          {
            label: "Viewer",
            value: "viewer",
          },
          {
            label: "Custom Role",
            value: "custom",
          },
        ]}
      />
      {renderPolicyContents()}
      <SaveButton
        text="Create Token"
        onClick={createToken}
        makeFlush={true}
        clearPosition={true}
        disabled={!apiTokenName}
      />
    </CreateTokenWrapper>
  );
};

export default CreateAPITokenForm;

const Flex = styled.div`
  display: flex;
  align-items: center;
  width: 70px;
  float: right;
  justify-content: space-between;
`;

const DeleteButton = styled.div`
  display: flex;
  visibility: ${(props: { invis?: boolean }) =>
    props.invis ? "hidden" : "visible"};
  align-items: center;
  justify-content: center;
  width: 30px;
  float: right;
  height: 30px;
  :hover {
    background: #ffffff11;
    border-radius: 20px;
    cursor: pointer;
  }

  > i {
    font-size: 20px;
    color: #ffffff44;
    border-radius: 20px;
  }
`;

const SettingsButton = styled(DeleteButton)`
  margin-right: -60px;
`;

const Role = styled.div`
  text-transform: capitalize;
  margin-right: 50px;
`;

const RoleSelectorWrapper = styled.div`
  font-size: 14px;
`;

const Placeholder = styled.div`
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  margin-top: 23px;
  justify-content: center;
  background: #ffffff11;
  border-radius: 5px;
  color: #ffffff44;
  font-size: 13px;
`;

const ButtonWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const CreateTokenWrapper = styled.div`
  width: 60%;
  min-width: 600px;
  position: relative;
`;

const CopyButton = styled.div`
  visibility: ${(props: { invis?: boolean }) =>
    props.invis ? "hidden" : "visible"};
  color: #ffffff;
  font-weight: 400;
  font-size: 13px;
  margin: 8px 0 8px 12px;
  float: right;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 120px;
  cursor: pointer;
  height: 30px;
  border-radius: 5px;
  border: 1px solid #ffffff20;
  background-color: #ffffff10;
  overflow: hidden;
  transition: all 0.1s ease-out;
  :hover {
    border: 1px solid #ffffff66;
    background-color: #ffffff20;
  }
`;

const NewLinkButton = styled(CopyButton)`
  border: none;
  width: auto;
  float: none;
  display: block;
  margin: unset;
  background-color: transparent;
  :hover {
    border: none;
    background-color: transparent;
  }
`;

const InviteButton = styled.div<{ disabled: boolean }>`
  height: 35px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 15px;
  margin-top: 13px;
  text-align: left;
  float: left;
  margin-left: 0;
  justify-content: center;
  border: 0;
  border-radius: 5px;
  background: ${(props) => (!props.disabled ? "#616FEEcc" : "#aaaabb")};
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
  margin-bottom: 10px;
`;

const Url = styled.a`
  max-width: 300px;
  font-size: 13px;
  user-select: text;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  > i {
    margin-left: 10px;
    font-size: 15px;
  }

  > span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  :hover {
    cursor: pointer;
  }
`;

const Invalid = styled.div`
  color: #f5cb42;
  margin-left: 15px;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;

const Status = styled.div<{ status: "accepted" | "expired" | "pending" }>`
  padding: 5px 10px;
  margin-right: 12px;
  background: ${(props) => {
    if (props.status === "accepted") return "#38a88a";
    if (props.status === "expired") return "#cc3d42";
    if (props.status === "pending") return "#ffffff11";
  }};
  font-size: 13px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 25px;
  max-width: 80px;
  text-transform: capitalize;
  font-weight: 400;
  user-select: none;
`;

const TokenDisplayBlock = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  background-color: #1b1d26;
  margin-bottom: 20px;
`;

const CopyTokenButton = styled.div`
  height: 30px;
  padding: 10px;
  cursor: pointer;

  > i {
    margin-left: 10px;
    font-size: 15px;
  }
`;

const CodeBlock = styled.div`
  display: inline-block;
  background-color: #1b1d26;
  color: white;
  border-radius: 5px;
  font-family: monospace;
  user-select: text;
  overflow: auto;
  padding: 10px;
  white-space: nowrap;
  border-right: 10px solid #1b1d26;
`;

const ControlRow = styled.div`
  width: 100%;
  display: flex;
  margin-left: auto;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
`;

const BackButton = styled.div`
  display: flex;
  width: 36px;
  cursor: pointer;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
`;
