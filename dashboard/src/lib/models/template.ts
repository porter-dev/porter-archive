import { ClientAddonType } from "lib/addons";
import { AddonTemplate } from "lib/addons/template";
import DeepgramForm from "main/home/inference-dashboard/TemplateForms/DeepgramForm";

export const ADDON_TEMPLATE_DEEPGRAM: AddonTemplate<"deepgram"> = {
    type: "deepgram",
    displayName: "Deepgram",
    description: "A popular speech-to-text service.",
    icon: "https://play-lh.googleusercontent.com/wczDL05-AOb39FcL58L32h6j_TrzzGTXDLlOrOmJ-aNsnoGsT1Gkk2vU4qyTb7tGxRw=w240-h480-rw",
    tags: ["Networking"],
    tabs: [
      {
        name: "configuration",
        displayName: "Configuration",
        component: DeepgramForm,
      },
    ],
    defaultValues: {
      type: "deepgram",
      deepgramAPIKey: "",
      quayUsername: "",
      quaySecret: "",
      quayEmail: "", 
      instanceType: "g4dn.xlarge",
    },
  };

export const SUPPORTED_MODEL_ADDON_TEMPLATES: Array<AddonTemplate<ClientAddonType>> = [
    ADDON_TEMPLATE_DEEPGRAM,
]