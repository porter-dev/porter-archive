export type Buildpack = {
  name: string;
  buildpack: string;
  config: {
    [key: string]: string;
  };
};

export type DetectedBuildpack = {
  name: string;
  builders: string[];
  detected: Buildpack[];
  others: Buildpack[];
};

export type DetectBuildpackResponse = DetectedBuildpack[];

export type UpdateBuildconfigResponse = {
  CreatedAt: string;
  DeletedAt: { Time: string; Valid: boolean };
  Time: string;
  Valid: boolean;
  ID: number;
  UpdatedAt: string;
  builder: string;
  buildpacks: string;
  config: string;
  name: string;
};
