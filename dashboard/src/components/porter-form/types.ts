/*
  Interfaces for the form YAML
  Will be merged with shared types later
*/

// YAML Field interfaces

import { ChartType, ContextProps } from "../../shared/types";

export interface GenericField {
  id: string;
  injectedProps: unknown;
}

export interface GenericInputField extends GenericField {
  isReadOnly?: boolean;
  required?: boolean;
  variable: string;
  settings?: any;

  // Read in value from Helm for existing revisions
  value?: [any] | [];
}

export interface HeadingField extends GenericField {
  type: "heading";
  label: string;
}

export interface SubtitleField extends GenericField {
  type: "subtitle";
  label: string;
}

export interface ServiceIPListField extends GenericField {
  type: "service-ip-list";
  value: any[];
}

export interface ResourceListField extends GenericField {
  type: "resource-list";
  value: any[];
  context?: {
    config?: {
      group: string;
      version: string;
      resource: string;
    };
  };
  settings?: {
    options?: {
      "resource-button": any;
    };
  };
}

export interface VeleroBackupField extends GenericField {
  type: "velero-create-backup";
}

export interface InputField extends GenericInputField {
  type: "input";
  label?: string;
  placeholder?: string;
  info?: string;
  settings?: {
    type?: "text" | "password" | "number";
    unit?: string;
    omitUnitFromValue?: boolean;
    default: string | number;
  };
}

export interface CheckboxField extends GenericInputField {
  type: "checkbox";
  label?: string;
  settings?: {};
}

export interface KeyValueArrayField extends GenericInputField {
  type: "key-value-array";
  label?: string;
  secretOption?: boolean;
  envLoader?: boolean;
  fileUpload?: boolean;
  settings?: {
    options?: {
      enable_synced_env_groups: boolean;
    };
    type: "env" | "normal";
  };
  injectedProps: {
    availableSyncEnvGroups: PopulatedEnvGroup[];
  };
}

export interface ArrayInputField extends GenericInputField {
  type: "array-input";
  label?: string;
}

export interface SelectField extends GenericInputField {
  type: "select";
  settings:
    | {
        type: "normal";
        options: { value: string; label: string }[];
      }
    | {
        type: "provider";
      };
  width: string;
  label?: string;
  dropdownLabel?: string;
  dropdownWidth?: number;
  dropdownMaxHeight?: string;
}

export interface VariableField extends GenericInputField {
  type: "variable";
  settings?: {
    default: any;
  };
}

export interface CronField extends GenericInputField {
  type: "cron";
  label: string;
  placeholder: string;
  settings: {
    default: string;
  };
}

export interface TextAreaField extends GenericInputField {
  type: "text-area";
  label: string;
  placeholder: string;
  info: string;
  settings: {
    default?: string;
    options?: {
      maxCount?: number;
      minCount?: number;
    };
  };
}

export interface UrlLinkField extends GenericInputField {
  type: "url-link";
  label: string;
  injectedProps: {
    chart: ChartType;
  };
}

export type FormField =
  | HeadingField
  | SubtitleField
  | InputField
  | CheckboxField
  | KeyValueArrayField
  | ArrayInputField
  | SelectField
  | ServiceIPListField
  | ResourceListField
  | VeleroBackupField
  | VariableField
  | CronField
  | TextAreaField
  | UrlLinkField;

export interface ShowIfAnd {
  and: ShowIf[];
}

export interface ShowIfOr {
  or: ShowIf[];
}

export interface ShowIfNot {
  not: ShowIf;
}

export type ShowIf = string | ShowIfAnd | ShowIfOr | ShowIfNot;

export interface Section {
  name: string;
  show_if?: ShowIf;
  contents: FormField[];
}

export interface Tab {
  name: string;
  label: string;
  sections: Section[];
  settings?: {
    omitFromLaunch?: boolean;
  };
}

export interface PorterFormData {
  name: string;
  hasSource: boolean;
  includeHiddenFields: boolean;
  isClusterScoped?: boolean;
  tabs: Tab[];
}

export interface PorterFormValidationInfo {
  validated: boolean;
  error?: string;
}

// internal field state interfaces
export interface StringInputFieldState {}
export interface CheckboxFieldState {}

export type PartialEnvGroup = {
  name: string;
  namespace: string;
  version: number;
};

export type PopulatedEnvGroup = {
  name: string;
  namespace: string;
  version: number;
  variables: {
    [key: string]: string;
  };
  applications: any[];
  meta_version: number;
  stack_id?: string;
};
export interface KeyValueArrayFieldState {
  values: {
    key: string;
    value: string;
  }[];
  showEnvModal: boolean;
  showEditorModal: boolean;
  synced_env_groups: PopulatedEnvGroup[];
}
export interface ArrayInputFieldState {}
export interface SelectFieldState {}

export type PorterFormFieldFieldState =
  | StringInputFieldState
  | CheckboxFieldState
  | KeyValueArrayField
  | ArrayInputFieldState
  | SelectFieldState;

// reducer interfaces

export interface PorterFormFieldValidationState {
  validated: boolean;
}

export interface PorterFormVariableList {
  [key: string]: any;
}

export interface PorterFormState {
  components: {
    [key: string]: {
      state: PorterFormFieldFieldState;
    };
  };
  validation: {
    [key: string]: PorterFormFieldValidationState;
  };
  variables: PorterFormVariableList;
}

export interface PorterFormInitFieldAction {
  type: "init-field";
  id: string;
  initValue: PorterFormFieldFieldState;
  initValidation?: Partial<PorterFormFieldValidationState>;
  initVars?: PorterFormVariableList;
}

export interface PorterFormUpdateFieldAction {
  type: "update-field";
  id: string;
  updateFunc: (
    prev: PorterFormFieldFieldState
  ) => Partial<PorterFormFieldFieldState>;
}

export interface PorterFormUpdateValidationAction {
  type: "update-validation";
  id: string;
  updateFunc: (
    prev: PorterFormFieldValidationState
  ) => PorterFormFieldValidationState;
}

export interface PorterFormMutateVariablesAction {
  type: "mutate-vars";
  mutateFunc: (prev: PorterFormVariableList) => PorterFormVariableList;
}

export type PorterFormAction =
  | PorterFormInitFieldAction
  | PorterFormUpdateFieldAction
  | PorterFormMutateVariablesAction
  | PorterFormUpdateValidationAction;

export type GetFinalVariablesFunction = (
  vars: PorterFormVariableList,
  props: FormField,
  state: PorterFormFieldFieldState,
  context: Partial<ContextProps>
) => PorterFormVariableList;

export type GetMetadataFunction<T = unknown> = (
  vars: PorterFormVariableList,
  props: FormField,
  state: PorterFormFieldFieldState,
  context: Partial<ContextProps>
) => T;

export type InjectedProps = Partial<
  {
    [K in FormField["type"]]: Extract<FormField, { type: K }>["injectedProps"];
  }
>;
