import type React from "react";
import { useState } from "react";
import { match } from "ts-pattern";

const CreateEKSCluster: React.FC = () => {
  const [step, setStep] = useState<"permissions" | "quotas">("permissions");
  return match(step)
    .with("permissions", () => null)
    .with("quotas", () => null)
    .exhaustive();
};

export default CreateEKSCluster;
