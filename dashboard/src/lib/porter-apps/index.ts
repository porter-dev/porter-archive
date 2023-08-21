import {
  BUILDPACK_TO_NAME,
  Buildpack,
  buildpackSchema,
} from "main/home/app-dashboard/types/buildpack";
import { z } from "zod";
import {
  deserializeService,
  serializedServiceFromProto,
  serviceValidator,
} from "./services";
import { PorterApp } from "@porter-dev/api-contracts";

// buildValidator is used to validate inputs for build setting fields
export const buildValidator = z.object({
  context: z.string().default("./"),
  method: z.enum(["pack", "docker", "registry"]),
  buildpacks: z.array(buildpackSchema),
  builder: z.string(),
  dockerfile: z.string(),
});
export type BuildOptions = z.infer<typeof buildValidator>;

// sourceValidator is used to validate inputs for source setting fields
export const sourceValidator = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("github"),
    git_repo_id: z.number(),
    git_branch: z.string(),
    git_repo_name: z.string(),
    porter_yaml_path: z.string(),
  }),
  z.object({
    type: z.literal("docker-registry"),
    image_repo_uri: z.string(),
    // add branch and repo as undefined to allow for easy checks on changes to the source type
    // (i.e. we want to remove the services if any source fields change)
    git_branch: z.undefined(),
    git_repo_name: z.undefined(),
  }),
]);
export type SourceOptions = z.infer<typeof sourceValidator>;

// porterAppValidator is the representation of a Porter app on the client, and is used to validate inputs for app setting fields
export const porterAppValidator = z.object({
  name: z.string(),
  services: serviceValidator.array(),
  env: z.record(z.string(), z.string()),
  build: buildValidator,
  predeploy: serviceValidator.optional(),
  image: z
    .object({
      repository: z.string(),
      tag: z.string(),
    })
    .optional(),
});
export type ClientPorterApp = z.infer<typeof porterAppValidator>;

// porterAppFormValidator is used to validate inputs when creating + updating an app
export const porterAppFormValidator = z.object({
  app: porterAppValidator,
  source: sourceValidator,
});
export type PorterAppFormData = z.infer<typeof porterAppFormValidator>;

// porterClientAppFromProto converts a PorterApp proto object to a ClientPorterApp
export function porterClientAppFromProto(
  proto: PorterApp,
  buildpacks?: Buildpack[]
): ClientPorterApp {
  const services = Object.entries(proto.services).map(([name, service]) =>
    deserializeService(serializedServiceFromProto({ name, service }))
  );

  const { name, env, build, predeploy, image } = proto;

  const validBuildpacks =
    build?.buildpacks.map((bp) => {
      const buildpack = buildpacks?.find((b) => b.buildpack === bp);
      return buildpack
        ? buildpack
        : {
            name: BUILDPACK_TO_NAME[bp],
            buildpack: bp,
          };
    }) ?? [];

  const app = {
    name,
    services,
    env,
    ...(build
      ? {
          build: {
            ...build,
            buildpacks: validBuildpacks,
            method:
              build.method === "pack" ? ("pack" as const) : ("docker" as const),
          },
        }
      : {
          build: {
            context: "./",
            method: "pack" as const,
            buildpacks: [],
            builder: "",
            dockerfile: "",
          },
        }),
    ...(predeploy && {
      predeploy: deserializeService(
        serializedServiceFromProto({ name: "predeploy", service: predeploy })
      ),
    }),
    image,
  };

  return app;
}
