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
import Table from "components/Table";
import RadioSelector from "components/RadioSelector";
import SelectRow from "components/form-components/SelectRow";
import SaveButton from "components/SaveButton";
import { APIToken } from "../APITokensSection";
import CheckboxList from "components/form-components/CheckboxList";
import { PolicyDocType } from "shared/auth/types";
import { ScopeOption } from "./CreateAPITokenForm";

type Props = {
  selectedClusterFields: ScopeOption[];
  setSelectedClusterFields: (scope: ScopeOption[]) => void;
  selectedRegistryFields: ScopeOption[];
  setSelectedRegistryFields: (scope: ScopeOption[]) => void;
  selectedInfraFields: ScopeOption[];
  setSelectedInfraFields: (scope: ScopeOption[]) => void;
  selectedSettingsFields: ScopeOption[];
  setSelectedSettingsFields: (scope: ScopeOption[]) => void;
  policyName: string;
  setPolicyName: (name: string) => void;
};

const clusterSettingsOptions = [
  { value: "namespace-read", label: "Read access to namespaces" },
  { value: "namespace-write", label: "Write access to namespaces" },
  {
    value: "release-read",
    label: "Read access to releases (applications, jobs, other helm charts)",
  },
  {
    value: "release-write",
    label: "Write access to releases (applications, jobs, other helm charts)",
  },
];

const registrySettingsOptions = [
  { value: "registry-read", label: "Read access to registries" },
  { value: "registry-write", label: "Write access to registries" },
];

const infraSettingsOptions = [
  {
    value: "infra-read",
    label:
      "Read access to infrastructure (provisioned clusters, registries, and databases)",
  },
  {
    value: "infra-write",
    label:
      "Write access to infrastructure (provisioned clusters, registries, and databases)",
  },
];

const projectSettingsOptions = [
  {
    value: "settings-read",
    label: "Read access to settings (project invites, API tokens, billing)",
  },
  {
    value: "settings-write",
    label: "Write access to settings (project invites, API tokens, billing)",
  },
];

const CustomPolicyForm: React.FunctionComponent<Props> = ({
  selectedClusterFields,
  setSelectedClusterFields,
  selectedRegistryFields,
  setSelectedRegistryFields,
  selectedInfraFields,
  setSelectedInfraFields,
  selectedSettingsFields,
  setSelectedSettingsFields,
  policyName,
  setPolicyName,
}) => {
  return (
    <CustomPolicyFormWrapper>
      <Heading>Custom Role Settings</Heading>
      <InputRow
        value={policyName}
        type="text"
        setValue={(newName: string) => setPolicyName(newName)}
        label="Role Name"
        width="100%"
        placeholder="ex: custom-developer-role"
        isRequired={true}
      />
      <Helper color="white">Cluster Access:</Helper>
      <CheckboxList
        options={clusterSettingsOptions}
        selected={selectedClusterFields}
        setSelected={setSelectedClusterFields}
      />
      <Helper color="white">Registry Access:</Helper>
      <CheckboxList
        options={registrySettingsOptions}
        selected={selectedRegistryFields}
        setSelected={setSelectedRegistryFields}
      />
      <Helper color="white">Infra Access:</Helper>
      <CheckboxList
        options={infraSettingsOptions}
        selected={selectedInfraFields}
        setSelected={setSelectedInfraFields}
      />
      <Helper color="white">Settings Access:</Helper>
      <CheckboxList
        options={projectSettingsOptions}
        selected={selectedSettingsFields}
        setSelected={setSelectedSettingsFields}
      />
    </CustomPolicyFormWrapper>
  );
};

export default CustomPolicyForm;

const CustomPolicyFormWrapper = styled.div`
  margin-bottom: 20px;
`;
