/*
  Interfaces for the form YAML
  Will be merged with shared types later
*/

export interface BasicFormField {
  type: string;
}

export interface HeadingField extends  BasicFormField {
  label: string;
}

export interface SubtitleField extends  BasicFormField {
  label: string;
}

export type FormField = HeadingField|SubtitleField;

export interface Section {
  name: string;
  contents: FormField[];
}

export interface Tab {
  name: string;
  label: string;
  sections: Section[];
}

export interface PorterFormData {
  name: string;
  hasSource: true;
  tabs: Tab[];
}

export interface PorterFormState {
  components: string[];
}

export interface PorterFormBaseAction {
  type: string;
}

export type PorterFormAction = PorterFormBaseAction;
