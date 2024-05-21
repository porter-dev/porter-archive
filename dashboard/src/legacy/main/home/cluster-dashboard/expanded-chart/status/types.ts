export type SelectedPodType = {
  spec: {
    [key: string]: any;
    containers: {
      [key: string]: any;
      name: string;
    }[];
  };
  metadata: {
    name: string;
    namespace: string;
    labels: {
      [key: string]: string;
    };
  };
  status: {
    phase: string;
  };
};
