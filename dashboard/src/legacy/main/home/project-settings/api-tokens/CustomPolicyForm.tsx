import React, { useContext, useEffect, useMemo, useState } from "react";
import backArrow from "legacy/assets/back_arrow.png";
import CopyToClipboard from "legacy/components/CopyToClipboard";
import CheckboxList from "legacy/components/form-components/CheckboxList";
import Heading from "legacy/components/form-components/Heading";
import Helper from "legacy/components/form-components/Helper";
import InputRow from "legacy/components/form-components/InputRow";
import SelectRow from "legacy/components/form-components/SelectRow";
import Loading from "legacy/components/Loading";
import Table from "legacy/components/OldTable";
import RadioSelector from "legacy/components/RadioSelector";
import SaveButton from "legacy/components/SaveButton";
import api from "legacy/shared/api";
import { InviteType } from "legacy/shared/types";
import { Column } from "react-table";
import styled from "styled-components";

import { PolicyDocType } from "shared/auth/types";
import { Context } from "shared/Context";

import { APIToken } from "../APITokensSection";
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