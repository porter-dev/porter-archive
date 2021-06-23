import React, { createContext } from "react";
import { PorterFormData } from "./types";

interface Props {
  formData: PorterFormData;
}

interface ContextProps {
  formData: PorterFormData;
}

export const PorterFormContext = createContext<ContextProps | undefined>(
  undefined!
);
const { Provider } = PorterFormContext;

export const PorterFormContextProvider: React.FC<Props> = (props) => {
  return (
    <Provider value={{ formData: props.formData }}>{props.children}</Provider>
  );
};
