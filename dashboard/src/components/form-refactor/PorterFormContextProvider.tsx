import React, { createContext, useReducer } from "react";
import { PorterFormData, PorterFormState, PorterFormAction } from "./types";

interface Props {
  formData: PorterFormData;
}

interface ContextProps {
  formData: PorterFormData;
  dispatchAction: (event: PorterFormAction) => void;
}

export const PorterFormContext = createContext<ContextProps | undefined>(
  undefined!
);
const { Provider } = PorterFormContext;

export const PorterFormContextProvider: React.FC<Props> = (props) => {
  const [state, dispatch] = useReducer(
    (state: PorterFormState, action: PorterFormAction) => {
      console.log(action);
      return state;
    },
    {
      components: [],
    }
  );
  return (
    <Provider value={{ formData: props.formData, dispatchAction: dispatch }}>
      {props.children}
    </Provider>
  );
};
