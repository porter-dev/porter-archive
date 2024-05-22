/*
  Interfaces for the form YAML
  Will be merged with shared types later
*/

// YAML Field interfaces

import { type ChartType, type ContextProps } from "../../shared/types";

export type GenericField = {
  id: string;
  injectedProps: unknown;
}

export type GenericInputField = {
  isReadOnly?: boolean;
  required?: boolean;
  variable: string;
  settings?: any;

  // Read in value from Helm for existing revisions
  value?: [any] | [];
} & GenericField

export type HeadingField = {
  type: "heading";
  label: string;
} & GenericField

export type SubtitleField = {
  type: "subtitle";
  label: string;
} & GenericField

export type ServiceIPListField = {
  type: "service-ip-list";
  value: any[];
} & GenericField

export type ResourceListField = {
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
} & GenericField

export type VeleroBackupField = {
  type: "velero-create-backup";
} & GenericField

export type InputField = {
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
} & GenericInputField

export type CheckboxField = {
  type: "checkbox";
  label?: string;
  settings?: {};
} & GenericInputField

export type KeyValueArrayField = {
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
} & GenericInputField

export type ArrayInputField = {
  type: "array-input";
  label?: string;
} & GenericInputField

export type DictionaryField = {
  type: "dictionary";
  label?: string;
} & GenericInputField

export type DictionaryArrayField = {
  type: "dictionary-array";
  label?: string;
} & GenericInputField

export type SelectField = {
  type: "select";
  settings:
  | {
    type: "normal";
    options: Array<{ value: string; label: string }>;
  }
  | {
    type: "provider";
  };
  width: string;
  label?: string;
  dropdownLabel?: string;
  dropdownWidth?: number;
  dropdownMaxHeight?: string;
} & GenericInputField

export type VariableField = {
  type: "variable";
  settings?: {
    default: any;
  };
} & GenericInputField

export type CronField = {
  type: "cron";
  label: string;
  placeholder: string;
  settings: {
    default: string;
  };
} & GenericInputField

export type TextAreaField = {
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
} & GenericInputField

export type UrlLinkField = {
  type: "url-link";
  label: string;
  injectedProps: {
    chart: ChartType;
  };
} & GenericInputField

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
  | DictionaryField
  | DictionaryArrayField
  | UrlLinkField;

export type ShowIfAnd = {
  and: ShowIf[];
}

export type ShowIfOr = {
  or: ShowIf[];
}

export type ShowIfNot = {
  not: ShowIf;
}

export type ShowIf = string | ShowIfAnd | ShowIfOr | ShowIfNot;

export type Section = {
  name: string;
  show_if?: ShowIf;
  contents: FormField[];
}

export type Tab = {
  name: string;
  label: string;
  sections: Section[];
  settings?: {
    omitFromLaunch?: boolean;
  };
}

export type PorterFormData = {
  name: string;
  hasSource: boolean;
  includeHiddenFields: boolean;
  isClusterScoped?: boolean;
  tabs: Tab[];
}

export type PorterFormValidationInfo = {
  validated: boolean;
  error?: string;
}

// internal field state interfaces
export type StringInputFieldState = { }
export type CheckboxFieldState = { }

export type PartialEnvGroup = {
  name: string;
  namespace: string;
  version: number;
};

export type PopulatedEnvGroup = {
  name: string;
  type?: string;
  namespace: string;
  version: number;
  variables: Record<string, string>;
  applications: any[];
  meta_version: number;
  stack_id?: string;
};

export type NewPopulatedEnvGroup = {
  name: string;
  current_version: number;
  variables: Record<string, string>;
  secret_variables: Record<string, string>;
  linked_applications: any[];
  created_at: number;
};
export type KeyValueArrayFieldState = {
  values: Array<{
    key: string;
    value: string;
  }>;
  showEnvModal: boolean;
  showEditorModal: boolean;
  synced_env_groups: PopulatedEnvGroup[];
}
export type ArrayInputFieldState = { }
export type DictionaryFieldState = {}
export type DictionaryArrayFieldState = { }
export type SelectFieldState = { }

export type PorterFormFieldFieldState =
  | StringInputFieldState
  | CheckboxFieldState
  | KeyValueArrayField
  | ArrayInputFieldState
  | DictionaryFieldState
  | DictionaryArrayFieldState
  | SelectFieldState;

// reducer interfaces

export type PorterFormFieldValidationState = {
  validated: boolean;
}

export type PorterFormVariableList = Record<string, any>

export type PorterFormState = {
  components: Record<string, {
      state: PorterFormFieldFieldState;
    }>;
  validation: Record<string, PorterFormFieldValidationState>;
  variables: PorterFormVariableList;
}

export type PorterFormInitFieldAction = {
  type: "init-field";
  id: string;
  initValue: PorterFormFieldFieldState;
  initValidation?: Partial<PorterFormFieldValidationState>;
  initVars?: PorterFormVariableList;
}

export type PorterFormUpdateFieldAction = {
  type: "update-field";
  id: string;
  updateFunc: (
    prev: PorterFormFieldFieldState
  ) => Partial<PorterFormFieldFieldState>;
}

export type PorterFormUpdateValidationAction = {
  type: "update-validation";
  id: string;
  updateFunc: (
    prev: PorterFormFieldValidationState
  ) => PorterFormFieldValidationState;
}

export type PorterFormMutateVariablesAction = {
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
  props: FormField | any,
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
